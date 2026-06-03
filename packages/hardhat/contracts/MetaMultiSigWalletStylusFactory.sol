// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// EIP-1167 minimal-proxy factory for the Stylus MetaMultiSigWallet.
//
// The Stylus port of MetaMultiSigWallet is ~29 KB compressed on Arbitrum, which
// exceeds the 24 KB EVM code-size limit. cargo-stylus deploys it as a
// fragmented contract, which means the canonical StylusDeployer's single-
// bytecode `deploy(bytecode, initData, ...)` path cannot represent it. Instead
// we deploy the Stylus contract ONCE as an implementation, then for each user
// account we deploy a tiny EIP-1167 proxy (~45 bytes of EVM bytecode, well
// under the limit) that delegatecalls into the impl. The proxy holds its own
// storage, so each account has independent signers/nonces/nullifiers while
// sharing one piece of WASM logic.
//
// Stylus/EVM interop note: when an EVM contract DELEGATECALLs a Stylus
// program, the Arbitrum runtime routes the call into the WASM VM with the
// caller's storage context — confirmed compatible with EIP-1167 proxies (see
// the Stylus Saturdays "Writing proxies in Arbitrum Stylus" issue).
contract MetaMultiSigWalletStylusFactory {
    // Stylus impl whose code every proxy will delegatecall into. Immutable so
    // the factory commits to a single, audited impl version per deployment.
    address public immutable implementation;

    event WalletCreated(address indexed wallet, uint256[] commitments, uint256 signaturesRequired);

    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
    }

    // Atomically clone the impl and call init() on the new proxy. Reverts if
    // init reverts so we never return a half-initialized wallet address.
    function createWallet(
        address zkvContract,
        bytes32 vkHash,
        address poseidonT3,
        uint256 chainId,
        uint256[] calldata initialCommitments,
        uint256 signaturesRequired
    ) external returns (address wallet) {
        wallet = _cloneEIP1167(implementation);

        (bool ok, bytes memory ret) = wallet.call(
            abi.encodeWithSignature(
                "init(address,bytes32,address,uint256,uint256[],uint256)",
                zkvContract,
                vkHash,
                poseidonT3,
                chainId,
                initialCommitments,
                signaturesRequired
            )
        );
        if (!ok) {
            // Bubble up the original revert data so the relayer sees the real
            // reason (e.g. WalletError(reason)) rather than a generic "init
            // failed".
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }

        emit WalletCreated(wallet, initialCommitments, signaturesRequired);
    }

    // Minimal proxy deployment via CREATE. EIP-1167 with a 5-byte prefix that
    // accepts plain ETH transfers locally instead of delegatecalling on empty
    // calldata. Required because the Stylus impl is fragmented by cargo-stylus;
    // the loader fragment dispatches on a 4-byte selector and reverts on empty
    // calldata, which would otherwise make plain `addr.transfer(...)` deposits
    // (and `receive()` routing) revert at gas estimation.
    //
    // Runtime layout (52 bytes):
    //   00: 36 15 60 32 57          if calldatasize == 0 → JUMPI to 0x32
    //   05..30: standard EIP-1167 body (PUSH1 jumpdest 0x2b shifted to 0x30)
    //   31: f3                       (RETURN inside EIP-1167 body)
    //   32: 5b 00                   JUMPDEST + STOP — empty-calldata branch
    function _cloneEIP1167(address target) private returns (address instance) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let ptr := mload(0x40)
            // bytes [0..24]: creation prefix (10) + empty-calldata check (5) +
            // EIP-1167 prelude up to PUSH20 (10); last 7 bytes of the word are
            // zero padding that the next mstore overwrites with the address.
            mstore(ptr, 0x3d603480600a3d3981f33615603257363d3d373d3d3d363d7300000000000000)
            // bytes [25..44]: 20-byte impl address (bytes20 left-aligned).
            mstore(add(ptr, 25), targetBytes)
            // bytes [45..61]: EIP-1167 suffix with internal JUMPDEST shifted
            // from 0x2b to 0x30, followed by the empty-calldata JUMPDEST + STOP.
            mstore(add(ptr, 45), 0x5af43d82803e903d91603057fd5bf35b00000000000000000000000000000000)
            instance := create(0, ptr, 62)
        }
        require(instance != address(0), "Clone failed");
    }
}
