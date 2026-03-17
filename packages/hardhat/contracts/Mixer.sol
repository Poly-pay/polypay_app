// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "poseidon-solidity/PoseidonT3.sol";

interface IVerifyProofAggregation {
    function verifyProofAggregation(
        uint256 _domainId,
        uint256 _aggregationId,
        bytes32 _leaf,
        bytes32[] calldata _merklePath,
        uint256 _leafCount,
        uint256 _index
    ) external view returns (bool);
}

contract Mixer is ReentrancyGuard {
    uint256 public constant BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    bytes32 public constant PROVING_SYSTEM_ID = keccak256(abi.encodePacked("ultraplonk"));
    bytes32 public constant VERSION_HASH = sha256(abi.encodePacked(""));
    uint256 public constant TREE_DEPTH = 20;
    uint256 public constant ROOT_HISTORY_SIZE = 30;

    address public immutable zkvContract;
    bytes32 public immutable vkHash;

    struct MerkleTree {
        uint256 nextIndex;
        uint256[TREE_DEPTH] filledSubtrees;
    }

    struct MixerProof {
        uint256 aggregationId;
        uint256 domainId;
        bytes32[] zkMerklePath;
        uint256 leafCount;
        uint256 index;
    }

    mapping(bytes32 => MerkleTree) public trees;
    mapping(bytes32 => bytes32[ROOT_HISTORY_SIZE]) public rootHistory;
    mapping(bytes32 => uint256) public rootHistoryIndex;
    mapping(bytes32 => mapping(bytes32 => bool)) public nullifierUsed;
    mapping(bytes32 => bool) public allowedDenominations;
    mapping(bytes32 => bool) public commitmentUsed;

    uint256[TREE_DEPTH + 1] internal zeroHashes;

    event Deposit(bytes32 indexed commitment, uint256 leafIndex, uint256 timestamp, address indexed token, uint256 denomination);
    event Withdrawal(address indexed recipient, bytes32 nullifierHash, address indexed token, uint256 denomination, uint256 timestamp);

    constructor(
        address _zkvContract,
        bytes32 _vkHash,
        bytes32[] memory _allowedPoolIds
    ) {
        require(_zkvContract != address(0), "Invalid zkv");
        zkvContract = _zkvContract;
        vkHash = _vkHash;
        for (uint256 i = 0; i < _allowedPoolIds.length; i++) {
            allowedDenominations[_allowedPoolIds[i]] = true;
        }
        _computeZeroHashes();
    }

    function _computeZeroHashes() internal {
        zeroHashes[0] = 0;
        for (uint256 i = 1; i <= TREE_DEPTH; i++) {
            zeroHashes[i] = _poseidonHash2(zeroHashes[i - 1], zeroHashes[i - 1]);
        }
    }

    /// @dev Exposed for Poseidon/zero-hash consistency tests (JS vs Solidity)
    function getZeroHash(uint256 level) external view returns (bytes32) {
        require(level <= TREE_DEPTH, "level");
        return bytes32(zeroHashes[level]);
    }

    function _poseidonHash2(uint256 a, uint256 b) internal view returns (uint256) {
        uint256 safeA = a % BN254_PRIME;
        uint256 safeB = b % BN254_PRIME;
        return PoseidonT3.hash([safeA, safeB]);
    }

    function _poolId(address token, uint256 denomination) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(token, denomination));
    }

    function deposit(address token, uint256 denomination, bytes32 commitment) external payable nonReentrant {
        bytes32 poolId = _poolId(token, denomination);
        require(allowedDenominations[poolId], "Denomination not allowed");
        require(!commitmentUsed[commitment], "Commitment already used");

        if (token == address(0)) {
            require(msg.value == denomination, "ETH value mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20");
            SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), denomination);
        }

        uint256 leaf = uint256(commitment);
        MerkleTree storage tree = trees[poolId];
        uint256 leafIndex = tree.nextIndex;
        tree.nextIndex++;

        uint256 current = leaf;
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if ((leafIndex >> i) % 2 == 0) {
                tree.filledSubtrees[i] = current;
                current = _poseidonHash2(current, zeroHashes[i]);
            } else {
                current = _poseidonHash2(tree.filledSubtrees[i], current);
            }
        }

        uint256 root = current;
        uint256 rhi = rootHistoryIndex[poolId] % ROOT_HISTORY_SIZE;
        rootHistory[poolId][rhi] = bytes32(root);
        rootHistoryIndex[poolId]++;

        commitmentUsed[commitment] = true;

        emit Deposit(commitment, tree.nextIndex - 1, block.timestamp, token, denomination);
    }

    function isKnownRoot(bytes32 poolId, bytes32 root) public view returns (bool) {
        uint256 rhi = rootHistoryIndex[poolId];
        if (rhi == 0) return false;
        uint256 size = rhi < ROOT_HISTORY_SIZE ? rhi : ROOT_HISTORY_SIZE;
        for (uint256 i = 0; i < size; i++) {
            uint256 idx = (rhi - 1 - i) % ROOT_HISTORY_SIZE;
            if (rootHistory[poolId][idx] == root) return true;
        }
        return false;
    }

    function _verifyMixerProof(
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address token,
        uint256 denomination,
        MixerProof calldata proof
    ) internal view returns (bool) {
        bytes memory encodedInputs = abi.encodePacked(
            root,
            nullifierHash,
            uint256(uint160(recipient)),
            uint256(uint160(token)),
            denomination
        );
        bytes32 leaf = keccak256(abi.encodePacked(PROVING_SYSTEM_ID, vkHash, VERSION_HASH, keccak256(encodedInputs)));
        return IVerifyProofAggregation(zkvContract).verifyProofAggregation(
            proof.domainId,
            proof.aggregationId,
            leaf,
            proof.zkMerklePath,
            proof.leafCount,
            proof.index
        );
    }

    function withdraw(
        address token,
        uint256 denomination,
        address recipient,
        bytes32 nullifierHash,
        bytes32 root,
        MixerProof calldata proof
    ) external nonReentrant {
        bytes32 poolId = _poolId(token, denomination);
        require(allowedDenominations[poolId], "Denomination not allowed");
        require(isKnownRoot(poolId, root), "Unknown root");
        require(!nullifierUsed[poolId][nullifierHash], "Nullifier already used");
        require(_verifyMixerProof(root, nullifierHash, recipient, token, denomination, proof), "Invalid proof");

        nullifierUsed[poolId][nullifierHash] = true;

        if (token == address(0)) {
            (bool success, ) = recipient.call{ value: denomination }("");
            require(success, "ETH transfer failed");
        } else {
            SafeERC20.safeTransfer(IERC20(token), recipient, denomination);
        }

        emit Withdrawal(recipient, nullifierHash, token, denomination, block.timestamp);
    }

    receive() external payable {}
}
