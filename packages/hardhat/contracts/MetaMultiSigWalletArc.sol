// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MetaMultiSigWalletArc
 * @notice Non-private ECDSA multisig for Circle's Arc network. It keeps the same
 *         transfer / batch surface as the production ZK `MetaMultiSigWallet`, but signer
 *         identities are plain addresses verified with `ecrecover` — no zkVerify, Noir,
 *         Kurier, or Poseidon. Signer identities are therefore PUBLIC.
 *
 *         Arc has no zkVerify contract, so the privacy-preserving wallet cannot run there;
 *         this variant trades privacy for portability. Use the production wallet (with the
 *         ZK flow) wherever signer privacy matters.
 */
contract MetaMultiSigWalletArc {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Events ============
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event TransactionExecuted(
        address indexed executor,
        uint256 indexed nonce,
        address to,
        uint256 value,
        bytes data,
        bytes result
    );
    event Owner(address indexed owner, bool isAdded);

    // ============ State ============
    uint256 public immutable chainId;
    uint256 public signaturesRequired;

    // Nonce tracking (prevent replay)
    mapping(uint256 => bool) public usedNonces;

    mapping(address => bool) public isOwner;
    address[] public owners;

    // ============ Constructor ============
    constructor(uint256 _chainId, address[] memory _owners, uint256 _signaturesRequired) {
        require(_signaturesRequired > 0, "Must be non-zero sigs required");
        require(_owners.length > 0, "Need at least 1 signer");
        require(_signaturesRequired <= _owners.length, "Sigs required too high");

        chainId = _chainId;
        signaturesRequired = _signaturesRequired;

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner exists");
            isOwner[owner] = true;
            owners.push(owner);
            emit Owner(owner, true);
        }
    }

    // ============ Modifiers ============
    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        _;
    }

    // ============ Main Execute Function ============
    /**
     * @notice Execute a transaction once enough owner signatures are supplied.
     * @dev Signatures must be sorted by ascending recovered signer address; this both
     *      enforces uniqueness (no signer counted twice) and gives a deterministic order.
     *      Signers sign `getTransactionHash(nonce, ...)` as an EIP-191 personal message.
     */
    function execute(
        uint256 _nonce,
        address to,
        uint256 value,
        bytes calldata data,
        bytes[] calldata signatures
    ) external returns (bytes memory) {
        require(!usedNonces[_nonce], "Nonce already used");
        require(signatures.length >= signaturesRequired, "Not enough signatures");

        bytes32 digest = getTransactionHash(_nonce, to, value, data).toEthSignedMessageHash();

        address lastSigner = address(0);
        for (uint256 i = 0; i < signatures.length; i++) {
            address recovered = digest.recover(signatures[i]);
            require(uint160(recovered) > uint160(lastSigner), "Duplicate or unordered signer");
            require(isOwner[recovered], "Not an owner");
            lastSigner = recovered;
        }

        usedNonces[_nonce] = true;

        (bool success, bytes memory result) = to.call{ value: value }(data);
        require(success, "Tx failed");

        emit TransactionExecuted(msg.sender, _nonce, to, value, data, result);
        return result;
    }

    // ============ Signer Management (self-called via execute) ============
    function addSigner(address newSigner, uint256 newSignaturesRequired) public onlySelf {
        require(newSigner != address(0), "Invalid owner");
        require(!isOwner[newSigner], "Owner exists");
        require(newSignaturesRequired > 0, "Must be non-zero sigs required");

        isOwner[newSigner] = true;
        owners.push(newSigner);
        signaturesRequired = newSignaturesRequired;

        require(signaturesRequired <= owners.length, "Sigs required too high");
        emit Owner(newSigner, true);
    }

    function removeSigner(address oldSigner, uint256 newSignaturesRequired) public onlySelf {
        require(isOwner[oldSigner], "Not an owner");
        require(owners.length > 1, "Cannot remove all signers");
        require(newSignaturesRequired > 0, "Must be non-zero sigs required");

        isOwner[oldSigner] = false;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == oldSigner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        signaturesRequired = newSignaturesRequired;

        require(signaturesRequired <= owners.length, "Sigs required too high");
        emit Owner(oldSigner, false);
    }

    function updateSignaturesRequired(uint256 newSignaturesRequired) public onlySelf {
        require(newSignaturesRequired > 0, "Must be non-zero sigs required");
        require(newSignaturesRequired <= owners.length, "Sigs required too high");
        signaturesRequired = newSignaturesRequired;
    }

    // ============ Batch Transfers (self-called via execute) ============
    /**
     * @notice Execute multiple native-token transfers in one transaction.
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
     * @notice Execute multiple transfers with mixed token types.
     * @param tokenAddresses address(0) = native token, otherwise an ERC20.
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
                (bool success, ) = recipients[i].call{ value: amounts[i] }("");
                require(success, "Native transfer failed");
            } else {
                (bool success, bytes memory data) = tokenAddresses[i].call(
                    abi.encodeWithSignature("transfer(address,uint256)", recipients[i], amounts[i])
                );
                require(success && (data.length == 0 || abi.decode(data, (bool))), "ERC20 transfer failed");
            }
        }
    }

    // ============ Views ============
    function getTransactionHash(
        uint256 _nonce,
        address to,
        uint256 value,
        bytes memory data
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data));
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getSignersCount() external view returns (uint256) {
        return owners.length;
    }

    // ============ Receive native token ============
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
}
