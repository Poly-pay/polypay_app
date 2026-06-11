// SPDX-License-Identifier: MIT
//
// Rust/Stylus port of MetaMultiSigWalletStylusFactory.sol.
//
// Behaviour is identical to the Solidity factory: each call to
// `createWallet(...)` deploys a fresh 62-byte EIP-1167-variant proxy in front
// of the immutable `implementation` Stylus contract and atomically invokes
// `init(...)` on it. The proxy bytecode is the same custom variant the
// Solidity factory emits: a 5-byte prefix that STOPs on empty calldata (so
// plain ETH transfers succeed despite the Stylus loader's dispatcher reverting
// on empty calldata) followed by the standard EIP-1167 delegatecall sequence.
//
// Why Rust here: the entire Arbitrum on-chain footprint is now Stylus/WASM
// end-to-end (impl + factory). Functionally identical to the Solidity
// version; the move is for the "all Rust" narrative and as a real-world
// exercise of `RawDeploy` + cross-contract calls from a Stylus factory.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use stylus_sdk::{
    alloy_primitives::{Address, B256, U256},
    alloy_sol_types::sol,
    deploy::RawDeploy,
    prelude::*,
    stylus_core::calls::Call,
};

sol! {
    event WalletCreated(
        address indexed wallet,
        uint256[] commitments,
        uint256 signaturesRequired
    );

    error FactoryError(string reason);
}

#[derive(SolidityError)]
pub enum Error {
    Factory(FactoryError),
}

fn err(reason: &str) -> Error {
    Error::Factory(FactoryError { reason: reason.into() })
}

sol_interface! {
    interface IMetaMultiSigWallet {
        function init(
            address zkvContract,
            bytes32 vkHash,
            address poseidonT3,
            uint256 chainId,
            uint256[] initialCommitments,
            uint256 signaturesRequired
        ) external;
    }
}

sol_storage! {
    #[entrypoint]
    pub struct MetaMultiSigWalletStylusFactory {
        // Immutable in spirit — set in the constructor and never reassigned.
        // Stylus doesn't have a real `immutable` keyword, but `init()` on the
        // impl carries an `initialized` guard so even if `implementation`
        // somehow flipped, the existing proxies wouldn't be retroactively
        // reinitializable.
        address implementation;
    }
}

#[public]
impl MetaMultiSigWalletStylusFactory {
    #[constructor]
    pub fn constructor(&mut self, implementation: Address) -> Result<(), Error> {
        if implementation.is_zero() {
            return Err(err("Invalid implementation"));
        }
        self.implementation.set(implementation);
        Ok(())
    }

    pub fn implementation(&self) -> Address {
        self.implementation.get()
    }

    /// Clone the impl behind a fresh EIP-1167-variant proxy and invoke
    /// `init(...)` atomically. Reverts if init reverts; never returns a
    /// half-initialized wallet address.
    pub fn create_wallet(
        &mut self,
        zkv_contract: Address,
        vk_hash: B256,
        poseidon_t3: Address,
        chain_id: U256,
        initial_commitments: Vec<U256>,
        signatures_required: U256,
    ) -> Result<Address, Error> {
        let impl_addr = self.implementation.get();
        let code = build_proxy_creation_code(impl_addr);

        // RawDeploy: CREATE with the constructed bytecode and zero value.
        // The Stylus SDK marks this `unsafe` because the StorageCache must be
        // managed manually around the deploy; we have no live storage caches
        // mid-call so it is safe here.
        let proxy = unsafe {
            RawDeploy::new()
                .deploy(self.vm(), &code, U256::ZERO)
                .map_err(|_| err("Clone failed"))?
        };
        if proxy.is_zero() {
            return Err(err("Clone failed"));
        }

        // Invoke init() on the newly-deployed proxy. The proxy will delegate
        // into the impl; impl's init() writes the proxy's storage and trips
        // its `initialized` flag. Construct the Call context first so its
        // mutable borrow of `self` is dropped before we hand `self.vm()` to
        // the sol_interface! method.
        let ctx = Call::new_mutating(self);
        let wallet = IMetaMultiSigWallet::new(proxy);
        wallet
            .init(
                self.vm(),
                ctx,
                zkv_contract,
                vk_hash,
                poseidon_t3,
                chain_id,
                initial_commitments.clone(),
                signatures_required,
            )
            .map_err(|_| err("Init failed"))?;

        self.vm().log(WalletCreated {
            wallet: proxy,
            commitments: initial_commitments,
            signaturesRequired: signatures_required,
        });

        Ok(proxy)
    }
}

/// Build the 62-byte creation bytecode for one EIP-1167-variant proxy. The
/// layout matches `MetaMultiSigWalletStylusFactory.sol::_cloneEIP1167` exactly
/// (10-byte creation prefix + 5-byte empty-calldata STOP prefix + EIP-1167
/// prelude + 20-byte impl address + shifted EIP-1167 suffix + JUMPDEST/STOP),
/// so proxies emitted by this Stylus factory and the Solidity factory are
/// byte-identical and front-end-indistinguishable.
fn build_proxy_creation_code(implementation: Address) -> Vec<u8> {
    let mut code = Vec::with_capacity(62);
    // Creation prefix (10 bytes): RETURNDATASIZE PUSH1 0x34 DUP1 PUSH1 0x0a
    // RETURNDATASIZE CODECOPY DUP2 RETURN — copies bytes [0x0a..0x3e] of
    // itself onto memory and returns them as the runtime code.
    code.extend_from_slice(&[
        0x3d, 0x60, 0x34, 0x80, 0x60, 0x0a, 0x3d, 0x39, 0x81, 0xf3,
    ]);
    // Runtime prefix (5 bytes): if calldatasize == 0 → JUMPI to offset 0x32
    // (the STOP at the very end of the runtime). Accepts plain ETH transfers
    // without falling into the delegatecall path that the Stylus loader would
    // revert on.
    code.extend_from_slice(&[0x36, 0x15, 0x60, 0x32, 0x57]);
    // EIP-1167 prelude up to and including the PUSH20 opcode (10 bytes).
    code.extend_from_slice(&[
        0x36, 0x3d, 0x3d, 0x37, 0x3d, 0x3d, 0x3d, 0x36, 0x3d, 0x73,
    ]);
    // PUSH20 operand: the 20-byte impl address.
    code.extend_from_slice(implementation.as_slice());
    // EIP-1167 suffix (17 bytes), with the internal JUMPDEST offset bumped
    // from 0x2b to 0x30 to account for the 5-byte prefix above. Trailing
    // bytes are the JUMPDEST + STOP target for the empty-calldata branch.
    code.extend_from_slice(&[
        0x5a, 0xf4, 0x3d, 0x82, 0x80, 0x3e, 0x90, 0x3d, 0x91, 0x60, 0x30, 0x57,
        0xfd, 0x5b, 0xf3, 0x5b, 0x00,
    ]);
    code
}

#[cfg(test)]
mod tests {
    use super::*;

    // The proxy bytecode the Solidity factory emits is hardcoded in
    // packages/hardhat/contracts/MetaMultiSigWalletStylusFactory.sol via two
    // mstores. This test guards against drift between the two factories by
    // checking the constructed creation bytecode at a known impl address
    // matches the expected hex string.
    #[test]
    fn proxy_bytecode_matches_solidity_factory() {
        // arbitrary impl address used purely as a test fixture
        let impl_addr =
            Address::from_slice(&hex_to_bytes_20("0907a7c0e73ef119d06e082914fc83aad1465aae"));
        let code = build_proxy_creation_code(impl_addr);
        // 10 creation + 5 prefix + 10 prelude + 20 addr + 17 suffix = 62
        assert_eq!(code.len(), 62);
        let expected = concat_hex(&[
            "3d603480600a3d3981f3", // creation prefix
            "3615603257",           // empty-calldata STOP check
            "363d3d373d3d3d363d73", // EIP-1167 prelude + PUSH20
            "0907a7c0e73ef119d06e082914fc83aad1465aae", // impl addr
            "5af43d82803e903d91603057fd5bf35b00",       // suffix + JUMPDEST + STOP
        ]);
        assert_eq!(hex::encode(&code), expected);
    }

    fn hex_to_bytes_20(s: &str) -> [u8; 20] {
        let mut out = [0u8; 20];
        for i in 0..20 {
            out[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).unwrap();
        }
        out
    }

    fn concat_hex(parts: &[&str]) -> alloc::string::String {
        let mut s = alloc::string::String::new();
        for p in parts {
            s.push_str(p);
        }
        s
    }

    // Vendored mini-hex encoder so tests don't need the `hex` crate as a
    // dev-dependency.
    mod hex {
        pub fn encode(bytes: &[u8]) -> alloc::string::String {
            let mut s = alloc::string::String::with_capacity(bytes.len() * 2);
            for b in bytes {
                s.push(nibble(b >> 4));
                s.push(nibble(b & 0x0f));
            }
            s
        }
        fn nibble(n: u8) -> char {
            match n {
                0..=9 => (b'0' + n) as char,
                10..=15 => (b'a' + n - 10) as char,
                _ => unreachable!(),
            }
        }
    }
}
