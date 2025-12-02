// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// import "poseidon-solidity/PoseidonT3.sol";

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

    // ============ Events ============
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event TransactionProposed(uint256 indexed txId, address to, uint256 value, bytes data);
    event SignatureSubmitted(uint256 indexed txId, uint256 nullifier);
    event TransactionExecuted(uint256 indexed txId, address to, uint256 value, bytes data, bytes result);
    event Owner(uint256 indexed commitment, bool isAdded);

    // ============ Structs ============
    struct ZkProof {
        uint256 nullifier;
        uint256 aggregationId;
        uint256 domainId;
        bytes32[] zkMerklePath;
        uint256 leafCount;
        uint256 index;
    }

    struct PendingTx {
        address to;
        uint256 value;
        bytes data;
        uint256 requiredApprovalsWhenExecuted;
        uint256 validSignatures;
        bool executed;
    }

    // ============ State ============
    address public immutable poseidon2Address;
    address public immutable zkvContract;
    bytes32 public immutable vkHash;
    uint256 public chainId;
    uint256 public nonce;
    uint256 public signaturesRequired;

    // Signer management
    uint256[] public commitments;
    uint256 public merkleRoot;

    // Transaction management
    mapping(uint256 => PendingTx) public pendingTxs;
    mapping(uint256 => bool) public usedNullifiers;

    // ============ Constructor ============
    constructor(
        address _poseidon2Address,
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

        poseidon2Address = _poseidon2Address;
        zkvContract = _zkvContract;
        vkHash = _vkHash;
        chainId = _chainId;
        signaturesRequired = _signaturesRequired;

        for (uint256 i = 0; i < _initialCommitments.length; i++) {
            require(_initialCommitments[i] != 0, "Invalid commitment");
            commitments.push(_initialCommitments[i]);
            emit Owner(_initialCommitments[i], true);
        }

        _rebuildMerkleRoot();
    }

    // ============ Modifiers ============
    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        _;
    }

    // ============ Transaction Flow ============
    function proposeTx(
        address to,
        uint256 value,
        bytes calldata data,
        ZkProof calldata proof
    ) external returns (uint256 txId) {
        // Use current nonce as txId
        txId = nonce;

        // Create pending tx first (needed for getTxHash)
        pendingTxs[txId] = PendingTx({
            to: to,
            value: value,
            data: data,
            requiredApprovalsWhenExecuted: signaturesRequired,
            validSignatures: 0,
            executed: false
        });

        // Check nullifier not used
        require(!usedNullifiers[proof.nullifier], "Nullifier already used");

        // Verify ZK proof
        bytes32 txHash = getTxHashFromTxid(txId);
        require(_verifyProof(txHash, proof), "Invalid proof");

        // Update state
        usedNullifiers[proof.nullifier] = true;
        pendingTxs[txId].validSignatures = 1;
        nonce++;

        emit TransactionProposed(txId, to, value, data);
        emit SignatureSubmitted(txId, proof.nullifier);
    }

    function submitSignature(uint256 txId, ZkProof calldata proof) external {
        PendingTx storage ptx = pendingTxs[txId];

        // Checks
        require(ptx.to != address(0), "Tx not exist");
        require(!ptx.executed, "Tx already executed");
        require(!usedNullifiers[proof.nullifier], "Nullifier already used");

        // Verify ZK proof
        bytes32 txHash = getTxHashFromTxid(txId);
        require(_verifyProof(txHash, proof), "Invalid proof");

        // Update state
        usedNullifiers[proof.nullifier] = true;
        ptx.validSignatures++;

        emit SignatureSubmitted(txId, proof.nullifier);
    }

    function executeTransaction(uint256 txId) external returns (bytes memory) {
        PendingTx storage ptx = pendingTxs[txId];

        // Checks
        require(ptx.to != address(0), "Tx not exist");
        require(!ptx.executed, "Tx already executed");
        require(ptx.validSignatures >= signaturesRequired, "Not enough signatures");

        // Execute
        ptx.executed = true;
        ptx.requiredApprovalsWhenExecuted = signaturesRequired;

        (bool success, bytes memory result) = ptx.to.call{ value: ptx.value }(ptx.data);
        require(success, "Tx failed");

        emit TransactionExecuted(txId, ptx.to, ptx.value, ptx.data, result);
        return result;
    }

    // ============ Signer Management ============
    function addSigner(uint256 newCommitment, uint256 newSigRequired) public onlySelf {
        require(newCommitment != 0, "Invalid commitment");
        require(commitments.length < MAX_SIGNERS, "Max signers reached");
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length + 1, "Sigs required too high");

        // Check duplicate
        for (uint256 i = 0; i < commitments.length; i++) {
            require(commitments[i] != newCommitment, "Commitment exists");
        }

        commitments.push(newCommitment);
        signaturesRequired = newSigRequired;
        _rebuildMerkleRoot();

        emit Owner(newCommitment, true);
    }

    function removeSigner(uint256 commitment, uint256 newSigRequired) public onlySelf {
        require(commitments.length > 1, "Cannot remove last signer");
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length - 1, "Sigs required too high");

        // Find and remove
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
        _rebuildMerkleRoot();

        emit Owner(commitment, false);
    }

    function updateSignaturesRequired(uint256 newSigRequired) public onlySelf {
        require(newSigRequired > 0, "Must be non-zero sigs required");
        require(newSigRequired <= commitments.length, "Sigs required too high");
        signaturesRequired = newSigRequired;
    }

    // ============ View Functions ============
    function getTxHashFromTxid(uint256 txId) public view returns (bytes32) {
        PendingTx storage ptx = pendingTxs[txId];
        return keccak256(abi.encodePacked(address(this), chainId, txId, ptx.to, ptx.value, ptx.data));
    }

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

    function getPendingTx(
        uint256 txId
    ) external view returns (address to, uint256 value, bytes memory data, uint256 validSignatures, uint256 requiredApprovalsWhenExecuted, bool executed) {
        PendingTx storage ptx = pendingTxs[txId];
        return (ptx.to, ptx.value, ptx.data, ptx.validSignatures, ptx.requiredApprovalsWhenExecuted, ptx.executed);
    }

    // ============ Internal Functions ============
    function _verifyProof(bytes32 txHash, ZkProof calldata proof) internal view returns (bool) {
        // Compute txHashCommitment = poseidon(txHash)
        uint256 txHashCommitment = poseidon2Hash1(uint256(txHash)); 

        // Encode public inputs (must match circuit order)
        bytes memory encodedInputs = abi.encodePacked(txHashCommitment, merkleRoot, proof.nullifier);

        // Calculate leaf for zkVerify
        bytes32 leaf = keccak256(abi.encodePacked(PROVING_SYSTEM_ID, vkHash, VERSION_HASH, keccak256(encodedInputs)));

        // Verify with zkVerify
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

    function _rebuildMerkleRoot() internal {
        uint256[] memory leaves = new uint256[](MAX_SIGNERS);

        // Copy commitments, rest are 0
        for (uint256 i = 0; i < commitments.length; i++) {
            leaves[i] = commitments[i];
        }

        // Build merkle tree bottom-up
        uint256 n = MAX_SIGNERS;
        while (n > 1) {
            for (uint256 i = 0; i < n / 2; i++) {
                leaves[i] = poseidon2Hash2(leaves[2 * i], leaves[2 * i + 1]);
            }
            n = n / 2;
        }

        merkleRoot = leaves[0];
    }

    // ============ Receive ETH ============
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // always return hash with 3 inputs, padding with 0s if needed
    // cause we use Yul library with fixed 3-input hash function
    // Yul library is more gas efficient
    function poseidon2Hash1(uint256 a) public view returns (uint256) {
        (bool success, bytes memory result) = poseidon2Address.staticcall(abi.encode(a, uint256(0), uint256(0)));
        require(success, "Poseidon2 hash failed");
        return abi.decode(result, (uint256));
    }

    function poseidon2Hash2(uint256 a, uint256 b) public view returns (uint256) {
        (bool success, bytes memory result) = poseidon2Address.staticcall(abi.encode(a, b, uint256(0)));
        require(success, "Poseidon2 hash failed");
        return abi.decode(result, (uint256));
    }
}
