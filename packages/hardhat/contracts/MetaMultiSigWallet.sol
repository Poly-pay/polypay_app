// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

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

contract MetaMultiSigWallet {
    // ============ Constants ============
    bytes32 public constant PROVING_SYSTEM_ID = keccak256(abi.encodePacked("ultraplonk"));
    bytes32 public constant VERSION_HASH = sha256(abi.encodePacked(""));
    uint256 public constant MAX_SIGNERS = 16;
    uint256 public constant BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // ============ Events ============
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event TransactionExecuted(uint256 indexed nonce, address to, uint256 value, bytes data, bytes result);
    event Owner(uint256 indexed commitment, bool isAdded);

    // ============ Structs ============
    struct ZkProof {
        uint256 commitment;
        uint256 nullifier;
        uint256 aggregationId;
        uint256 domainId;
        bytes32[] zkMerklePath;
        uint256 leafCount;
        uint256 index;
    }

    // ============ State ============
    address public immutable zkvContract;
    bytes32 public immutable vkHash;
    uint256 public chainId;
    uint256 public signaturesRequired;

    // Signer management
    uint256[] public commitments;

    // Nonce tracking (prevent replay)
    mapping(uint256 => bool) public usedNonces;

    // Nullifier tracking (prevent double-signing)
    mapping(uint256 => bool) public usedNullifiers;

    // ============ Constructor ============
    constructor(
        address _zkvContract,
        bytes32 _vkHash,
        uint256 _chainId,
        uint256[] memory _initialCommitments,
        uint256 _signaturesRequired
    ) {
        require(_zkvContract != address(0), "Invalid zkv address");
        require(_signaturesRequired > 0, "Must be non-zero sigs required");
        require(_initialCommitments.length > 0, "Need at least 1 signer");
        require(_signaturesRequired <= _initialCommitments.length, "Sigs required too high");

        zkvContract = _zkvContract;
        vkHash = _vkHash;
        chainId = _chainId;
        signaturesRequired = _signaturesRequired;

        for (uint256 i = 0; i < _initialCommitments.length; i++) {
            require(_initialCommitments[i] != 0, "Invalid commitment");
            commitments.push(_initialCommitments[i]);
            emit Owner(_initialCommitments[i], true);
        }
    }

    // ============ Modifiers ============
    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        _;
    }

    // ============ Main Execute Function ============
    function execute(
        uint256 _nonce,
        address to,
        uint256 value,
        bytes calldata data,
        ZkProof[] calldata proofs
    ) external returns (bytes memory) {
        require(!usedNonces[_nonce], "Nonce already used");
        require(proofs.length >= signaturesRequired, "Not enough proofs");

        bytes32 txHash = keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data));

        for (uint256 i = 0; i < proofs.length; i++) {
            require(!usedNullifiers[proofs[i].nullifier], "Nullifier already used");
            require(_isCurrentSigner(proofs[i].commitment), "Not a current signer");
            require(_verifyProof(txHash, proofs[i]), "Invalid proof");
            usedNullifiers[proofs[i].nullifier] = true;
        }

        usedNonces[_nonce] = true;

        (bool success, bytes memory result) = to.call{ value: value }(data);
        require(success, "Tx failed");

        emit TransactionExecuted(_nonce, to, value, data, result);
        return result;
    }

    // ============ Signer Management ============
    function addSigner(uint256 newCommitment, uint256 newSigRequired) public onlySelf {
        require(newCommitment != 0, "Invalid commitment");
        require(commitments.length < MAX_SIGNERS, "Max signers reached");
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length + 1, "Sigs required too high");

        for (uint256 i = 0; i < commitments.length; i++) {
            require(commitments[i] != newCommitment, "Commitment exists");
        }

        commitments.push(newCommitment);
        signaturesRequired = newSigRequired;

        emit Owner(newCommitment, true);
    }

    function removeSigner(uint256 commitment, uint256 newSigRequired) public onlySelf {
        require(commitments.length > 1, "Cannot remove last signer");
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length - 1, "Sigs required too high");

        bool found = false;
        for (uint256 i = 0; i < commitments.length; i++) {
            if (commitments[i] == commitment) {
                commitments[i] = commitments[commitments.length - 1];
                commitments.pop();
                found = true;
                break;
            }
        }
        require(found, "Commitment not found");

        signaturesRequired = newSigRequired;

        emit Owner(commitment, false);
    }

    function updateSignaturesRequired(uint256 newSigRequired) public onlySelf {
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length, "Sigs required too high");
        signaturesRequired = newSigRequired;
    }

    /**
     * @notice Execute multiple transfers in one transaction
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) public onlySelf {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "Empty batch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            (bool success, ) = recipients[i].call{ value: amounts[i] }("");
            require(success, "Transfer failed");
        }
    }

    /**
     * @notice Execute multiple transfers with mixed token types
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     * @param tokenAddresses Array of token addresses (address(0) = native ETH)
     */
    function batchTransferMulti(
        address[] calldata recipients,
        uint256[] calldata amounts,
        address[] calldata tokenAddresses
    ) public onlySelf {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length == tokenAddresses.length, "Length mismatch");
        require(recipients.length > 0, "Empty batch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");

            if (tokenAddresses[i] == address(0)) {
                // Native ETH transfer
                (bool success, ) = recipients[i].call{ value: amounts[i] }("");
                require(success, "ETH transfer failed");
            } else {
                // ERC20 transfer
                (bool success, bytes memory data) = tokenAddresses[i].call(
                    abi.encodeWithSignature("transfer(address,uint256)", recipients[i], amounts[i])
                );
                require(success && (data.length == 0 || abi.decode(data, (bool))), "ERC20 transfer failed");
            }
        }
    }

    // ============ View Functions ============
    function getTransactionHash(
        uint256 _nonce,
        address to,
        uint256 value,
        bytes memory data
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data));
    }

    function getCommitments() external view returns (uint256[] memory) {
        return commitments;
    }

    function getSignersCount() external view returns (uint256) {
        return commitments.length;
    }

    // ============ Internal Functions ============
    function _verifyProof(bytes32 txHash, ZkProof calldata proof) internal view returns (bool) {
        uint256 txHashCommitment = poseidonHash2(uint256(txHash), 1);

        // Public inputs order: tx_hash_commitment, commitment, nullifier
        bytes memory encodedInputs = abi.encodePacked(txHashCommitment, proof.commitment, proof.nullifier);

        bytes32 leaf = keccak256(abi.encodePacked(PROVING_SYSTEM_ID, vkHash, VERSION_HASH, keccak256(encodedInputs)));

        return
            IVerifyProofAggregation(zkvContract).verifyProofAggregation(
                proof.domainId,
                proof.aggregationId,
                leaf,
                proof.zkMerklePath,
                proof.leafCount,
                proof.index
            );
    }

    function _isCurrentSigner(uint256 commitment) internal view returns (bool) {
        for (uint256 i = 0; i < commitments.length; i++) {
            if (commitments[i] == commitment) {
                return true;
            }
        }
        return false;
    }

    // ============ Receive ETH ============
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function poseidonHash2(uint256 a, uint256 b) public pure returns (uint256) {
        uint256 safeA = a % BN254_PRIME;
        uint256 safeB = b % BN254_PRIME;
        return PoseidonT3.hash([safeA, safeB]);
    }
}
