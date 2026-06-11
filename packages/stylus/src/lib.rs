// SPDX-License-Identifier: MIT
//
// MetaMultiSigWallet ported from Solidity to Arbitrum Stylus (Rust/WASM).
//
// Behaviour is kept byte-for-byte compatible with the original
// `packages/hardhat/contracts/MetaMultiSigWallet.sol` so that the rest of the
// stack (frontend viem calls, backend relayer execute path, the Noir circuit
// public-input ordering, and the zkVerify aggregation leaf format) keeps
// working unchanged. The exported Solidity ABI is identical except:
//   - the constructor takes one extra arg `poseidonT3` (the deployed
//     PoseidonT3 address) because Stylus has no linked-library mechanism, so we
//     call the library by address instead of linking it at deploy time.
//
// Poseidon: instead of re-implementing the hash in Rust we STATICCALL the
// already-deployed `poseidon-solidity` PoseidonT3 contract. A STATICCALL to a
// pure function returns the exact same value as the Solidity contract's
// DELEGATECALL into the linked library, so commitments computed here match the
// circuit's public inputs with zero risk of divergence. Re-implementing
// Poseidon natively in Rust (for cheaper gas) is documented as future work in
// README.md and MUST be validated against a known vector before use.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use stylus_sdk::{
    abi::Bytes,
    alloy_primitives::{uint, Address, B256, U256},
    alloy_sol_types::sol,
    call::{call, static_call},
    crypto::keccak,
    prelude::*,
    stylus_core::calls::Call,
};

// BN254 scalar field prime, matching `BN254_PRIME` in the Solidity contract.
const BN254_PRIME: U256 =
    uint!(21888242871839275222246405745257275088548364400416034343698204186575808495617_U256);

// VERSION_HASH = sha256(abi.encodePacked("")) — sha256 of the empty byte string.
// Precomputed constant so we don't pull a sha256 implementation into the WASM.
const VERSION_HASH: B256 = B256::new([
    0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14, 0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
    0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c, 0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55,
]);

sol! {
    // Mirrors the Solidity `ZkProof` struct field order exactly — the ABI tuple
    // ordering must not change or the relayer's encoded calldata won't decode.
    // `AbiType` lets the struct be used as a Stylus method argument.
    #[derive(AbiType)]
    struct ZkProof {
        uint256 commitment;
        uint256 nullifier;
        uint256 aggregationId;
        uint256 domainId;
        bytes32[] zkMerklePath;
        uint256 leafCount;
        uint256 index;
    }

    error WalletError(string reason);
}

#[derive(SolidityError)]
pub enum Error {
    Wallet(WalletError),
}

fn err(reason: &str) -> Error {
    Error::Wallet(WalletError { reason: reason.into() })
}

sol_storage! {
    #[entrypoint]
    pub struct MetaMultiSigWallet {
        address zkv_contract;
        bytes32 vk_hash;
        address poseidon_t3;
        uint256 chain_id;
        uint256 signatures_required;
        uint256[] commitments;
        mapping(uint256 => bool) used_nonces;
        mapping(uint256 => bool) used_nullifiers;
        // Set to true on first successful constructor/init. Guards against
        // double-init when this contract is used as an EIP-1167 clone target:
        // the impl runs the constructor once at deploy (initialized=true on
        // impl storage, which is unused), and each freshly-cloned proxy starts
        // with initialized=false and must be initialized exactly once by the
        // factory in the same transaction as the clone.
        bool initialized;
    }
}

#[public]
impl MetaMultiSigWallet {
    #[constructor]
    pub fn constructor(
        &mut self,
        zkv_contract: Address,
        vk_hash: B256,
        poseidon_t3: Address,
        chain_id: U256,
        initial_commitments: Vec<U256>,
        signatures_required: U256,
    ) -> Result<(), Error> {
        self.initialize_state(
            zkv_contract,
            vk_hash,
            poseidon_t3,
            chain_id,
            initial_commitments,
            signatures_required,
        )
    }

    // Proxy-friendly initializer. Identical semantics to `constructor` but
    // callable post-deploy through an EIP-1167 minimal proxy, which does not
    // execute the impl's constructor. Reverts if already initialized.
    pub fn init(
        &mut self,
        zkv_contract: Address,
        vk_hash: B256,
        poseidon_t3: Address,
        chain_id: U256,
        initial_commitments: Vec<U256>,
        signatures_required: U256,
    ) -> Result<(), Error> {
        self.initialize_state(
            zkv_contract,
            vk_hash,
            poseidon_t3,
            chain_id,
            initial_commitments,
            signatures_required,
        )
    }

    // ============ Main Execute Function ============
    pub fn execute(
        &mut self,
        nonce: U256,
        to: Address,
        value: U256,
        data: Bytes,
        proofs: Vec<ZkProof>,
    ) -> Result<Bytes, Error> {
        if self.used_nonces.get(nonce) {
            return Err(err("Nonce already used"));
        }
        if U256::from(proofs.len()) < self.signatures_required.get() {
            return Err(err("Not enough proofs"));
        }

        let data_bytes: Vec<u8> = data.into();
        let tx_hash = self.compute_tx_hash(nonce, to, value, &data_bytes);

        for p in proofs.iter() {
            if self.used_nullifiers.get(p.nullifier) {
                return Err(err("Nullifier already used"));
            }
            if !self.is_current_signer(p.commitment) {
                return Err(err("Not a current signer"));
            }
            if !self.verify_proof(tx_hash, p)? {
                return Err(err("Invalid proof"));
            }
            self.used_nullifiers.insert(p.nullifier, true);
        }

        self.used_nonces.insert(nonce, true);

        // Self-calls (onlySelf wallet management functions) are dispatched
        // internally instead of going through an EVM CALL. Working theory: in
        // Stylus's delegatecall context (impl running in proxy storage), the
        // outbound CALL's msg.sender is not set to address(this) (= proxy) the
        // way standard EVM semantics dictate, so the inner only_self() check
        // in addSigners/removeSigners/etc. reverts. Routing the call through
        // an internal Rust dispatch keeps the storage writes correct and
        // avoids the EVM round-trip entirely. See packages/stylus/NOTES.md.
        let result: Vec<u8> = if to == self.vm().contract_address() {
            if !value.is_zero() {
                return Err(err("Self-call: nonzero value"));
            }
            self.dispatch_self_call(&data_bytes)?;
            Vec::new()
        } else {
            let context = Call::new_payable(self, value);
            call(self.vm(), context, to, &data_bytes).map_err(|_| err("Tx failed"))?
        };

        Ok(result.into())
    }

    // ============ Signer Management (onlySelf) ============
    // Public methods are thin wrappers around the *_internal helpers so that
    // external direct calls still go through only_self(), while execute()'s
    // self-call dispatcher (which can't rely on msg.sender under Stylus
    // delegatecall) invokes the internals directly. See NOTES.md.
    pub fn add_signers(
        &mut self,
        new_commitments: Vec<U256>,
        new_sig_required: U256,
    ) -> Result<(), Error> {
        self.only_self()?;
        self.add_signers_internal(new_commitments, new_sig_required)
    }

    pub fn remove_signers(
        &mut self,
        commitments_to_remove: Vec<U256>,
        new_sig_required: U256,
    ) -> Result<(), Error> {
        self.only_self()?;
        self.remove_signers_internal(commitments_to_remove, new_sig_required)
    }

    pub fn update_signatures_required(&mut self, new_sig_required: U256) -> Result<(), Error> {
        self.only_self()?;
        self.update_signatures_required_internal(new_sig_required)
    }

    // ============ Batch transfers (onlySelf) ============
    pub fn batch_transfer(
        &mut self,
        recipients: Vec<Address>,
        amounts: Vec<U256>,
    ) -> Result<(), Error> {
        self.only_self()?;
        self.batch_transfer_internal(recipients, amounts)
    }

    pub fn batch_transfer_multi(
        &mut self,
        recipients: Vec<Address>,
        amounts: Vec<U256>,
        token_addresses: Vec<Address>,
    ) -> Result<(), Error> {
        self.only_self()?;
        self.batch_transfer_multi_internal(recipients, amounts, token_addresses)
    }

    // ============ View functions ============
    pub fn get_transaction_hash(
        &self,
        nonce: U256,
        to: Address,
        value: U256,
        data: Bytes,
    ) -> B256 {
        self.compute_tx_hash(nonce, to, value, data.as_ref())
    }

    pub fn get_commitments(&self) -> Vec<U256> {
        let len = self.commitments.len();
        let mut out = Vec::with_capacity(len);
        for i in 0..len {
            out.push(self.commitments.get(i).unwrap());
        }
        out
    }

    pub fn get_signers_count(&self) -> U256 {
        U256::from(self.commitments.len())
    }

    pub fn signatures_required(&self) -> U256 {
        self.signatures_required.get()
    }

    // ============ Receive ETH ============
    #[receive]
    #[payable]
    pub fn receive(&mut self) -> Result<(), Vec<u8>> {
        Ok(())
    }
}

// Internal logic for the onlySelf methods + the self-call dispatcher used by
// execute(). Kept outside `#[public]` so they are not part of the Solidity ABI.
impl MetaMultiSigWallet {
    fn add_signers_internal(
        &mut self,
        new_commitments: Vec<U256>,
        new_sig_required: U256,
    ) -> Result<(), Error> {
        if new_commitments.is_empty() {
            return Err(err("Empty array"));
        }
        if new_sig_required.is_zero() {
            return Err(err("Must be non-zero sigs required"));
        }
        let total = U256::from(self.commitments.len() + new_commitments.len());
        if new_sig_required > total {
            return Err(err("Sigs required too high"));
        }

        for i in 0..new_commitments.len() {
            let nc = new_commitments[i];
            if nc.is_zero() {
                return Err(err("Invalid commitment"));
            }
            // Duplicate against existing signers.
            if self.is_current_signer(nc) {
                return Err(err("Commitment exists"));
            }
            // Duplicate within the input array.
            for k in 0..i {
                if new_commitments[k] == nc {
                    return Err(err("Duplicate in input"));
                }
            }
            self.commitments.push(nc);
        }

        self.signatures_required.set(new_sig_required);
        Ok(())
    }

    fn remove_signers_internal(
        &mut self,
        commitments_to_remove: Vec<U256>,
        new_sig_required: U256,
    ) -> Result<(), Error> {
        if commitments_to_remove.is_empty() {
            return Err(err("Empty array"));
        }
        if self.commitments.len() <= commitments_to_remove.len() {
            return Err(err("Cannot remove all signers"));
        }
        if new_sig_required.is_zero() {
            return Err(err("Must be non-zero sigs required"));
        }
        let remaining = U256::from(self.commitments.len() - commitments_to_remove.len());
        if new_sig_required > remaining {
            return Err(err("Sigs required too high"));
        }

        for target in commitments_to_remove.iter() {
            let mut found = false;
            let len = self.commitments.len();
            for j in 0..len {
                if self.commitments.get(j).unwrap() == *target {
                    // Swap-and-pop, same as the Solidity version.
                    let last = self.commitments.get(len - 1).unwrap();
                    self.commitments.setter(j).unwrap().set(last);
                    self.commitments.pop();
                    found = true;
                    break;
                }
            }
            if !found {
                return Err(err("Commitment not found"));
            }
        }

        self.signatures_required.set(new_sig_required);
        Ok(())
    }

    fn update_signatures_required_internal(&mut self, new_sig_required: U256) -> Result<(), Error> {
        if new_sig_required.is_zero() {
            return Err(err("Must be non-zero sigs required"));
        }
        if new_sig_required > U256::from(self.commitments.len()) {
            return Err(err("Sigs required too high"));
        }
        self.signatures_required.set(new_sig_required);
        Ok(())
    }

    fn batch_transfer_internal(
        &mut self,
        recipients: Vec<Address>,
        amounts: Vec<U256>,
    ) -> Result<(), Error> {
        if recipients.len() != amounts.len() {
            return Err(err("Length mismatch"));
        }
        if recipients.is_empty() {
            return Err(err("Empty batch"));
        }
        for i in 0..recipients.len() {
            if recipients[i].is_zero() {
                return Err(err("Invalid recipient"));
            }
            let ctx = Call::new_payable(self, amounts[i]);
            call(self.vm(), ctx, recipients[i], &[]).map_err(|_| err("Transfer failed"))?;
        }
        Ok(())
    }

    fn batch_transfer_multi_internal(
        &mut self,
        recipients: Vec<Address>,
        amounts: Vec<U256>,
        token_addresses: Vec<Address>,
    ) -> Result<(), Error> {
        if recipients.len() != amounts.len() || recipients.len() != token_addresses.len() {
            return Err(err("Length mismatch"));
        }
        if recipients.is_empty() {
            return Err(err("Empty batch"));
        }

        for i in 0..recipients.len() {
            if recipients[i].is_zero() {
                return Err(err("Invalid recipient"));
            }

            if token_addresses[i].is_zero() {
                // Native ETH transfer.
                let ctx = Call::new_payable(self, amounts[i]);
                call(self.vm(), ctx, recipients[i], &[])
                    .map_err(|_| err("ETH transfer failed"))?;
            } else {
                // ERC20 transfer via low-level call, tolerating non-standard
                // tokens that return no data (same as the Solidity version).
                // Manually packed (selector + padded address + amount) to avoid
                // pulling the dynamic ABI codec into the WASM.
                let mut calldata = Vec::with_capacity(68);
                calldata.extend_from_slice(&[0xa9, 0x05, 0x9c, 0xbb]); // transfer(address,uint256)
                calldata.extend_from_slice(&[0u8; 12]); // left-pad address to 32 bytes
                calldata.extend_from_slice(recipients[i].as_slice());
                calldata.extend_from_slice(&amounts[i].to_be_bytes::<32>());

                let ctx = Call::new_mutating(self);
                let ret = call(self.vm(), ctx, token_addresses[i], &calldata)
                    .map_err(|_| err("ERC20 transfer failed"))?;

                // Accept empty return (non-standard tokens) or an ABI bool `true`.
                let ok = ret.is_empty() || (ret.len() == 32 && ret[31] != 0);
                if !ok {
                    return Err(err("ERC20 transfer failed"));
                }
            }
        }
        Ok(())
    }

    // Dispatch a self-call (to == address(this)) from execute() directly to the
    // matching *_internal function. Mirrors the public Solidity selectors so
    // the relayer's calldata works unchanged.
    fn dispatch_self_call(&mut self, data: &[u8]) -> Result<(), Error> {
        if data.len() < 4 {
            return Err(err("Self-call: empty selector"));
        }
        let selector = [data[0], data[1], data[2], data[3]];
        let args = &data[4..];
        match selector {
            // addSigners(uint256[],uint256)
            [0xa8, 0xd2, 0xc8, 0x52] => {
                let commitments = decode_u256_array(args, 0)?;
                let sig_required = decode_u256(args, 32)?;
                self.add_signers_internal(commitments, sig_required)
            }
            // removeSigners(uint256[],uint256)
            [0x47, 0x91, 0xca, 0x34] => {
                let commitments = decode_u256_array(args, 0)?;
                let sig_required = decode_u256(args, 32)?;
                self.remove_signers_internal(commitments, sig_required)
            }
            // updateSignaturesRequired(uint256)
            [0x30, 0x34, 0xa7, 0x42] => {
                let sig_required = decode_u256(args, 0)?;
                self.update_signatures_required_internal(sig_required)
            }
            // batchTransfer(address[],uint256[])
            [0x88, 0xd6, 0x95, 0xb2] => {
                let recipients = decode_address_array(args, 0)?;
                let amounts = decode_u256_array(args, 32)?;
                self.batch_transfer_internal(recipients, amounts)
            }
            // batchTransferMulti(address[],uint256[],address[])
            [0x64, 0x45, 0x12, 0x12] => {
                let recipients = decode_address_array(args, 0)?;
                let amounts = decode_u256_array(args, 32)?;
                let tokens = decode_address_array(args, 64)?;
                self.batch_transfer_multi_internal(recipients, amounts, tokens)
            }
            _ => Err(err("Self-call: unknown selector")),
        }
    }
}

// Hand-rolled Solidity ABI decoders for the static handful of types used by
// dispatch_self_call(). Pulling the full alloy ABI codec into the WASM would
// bloat the compressed contract size, which has to stay under the 24 KiB Stylus
// code-size limit to deploy on Arbitrum One.
fn decode_u256(data: &[u8], offset: usize) -> Result<U256, Error> {
    if data.len() < offset + 32 {
        return Err(err("Self-call: short uint256"));
    }
    Ok(U256::from_be_slice(&data[offset..offset + 32]))
}

fn decode_address(data: &[u8], offset: usize) -> Result<Address, Error> {
    if data.len() < offset + 32 {
        return Err(err("Self-call: short address"));
    }
    // Solidity left-pads addresses with 12 zero bytes inside a 32-byte word.
    Ok(Address::from_slice(&data[offset + 12..offset + 32]))
}

fn decode_offset(data: &[u8], offset_word: usize) -> Result<usize, Error> {
    let raw = decode_u256(data, offset_word)?;
    // Calldata is bounded by gas; anything above u32::MAX is malformed.
    if raw > U256::from(u32::MAX) {
        return Err(err("Self-call: bad offset"));
    }
    Ok(raw.as_limbs()[0] as usize)
}

fn decode_u256_array(data: &[u8], offset_word: usize) -> Result<Vec<U256>, Error> {
    let head = decode_offset(data, offset_word)?;
    let len = decode_offset(data, head)?;
    let mut out = Vec::with_capacity(len);
    for i in 0..len {
        out.push(decode_u256(data, head + 32 + 32 * i)?);
    }
    Ok(out)
}

fn decode_address_array(data: &[u8], offset_word: usize) -> Result<Vec<Address>, Error> {
    let head = decode_offset(data, offset_word)?;
    let len = decode_offset(data, head)?;
    let mut out = Vec::with_capacity(len);
    for i in 0..len {
        out.push(decode_address(data, head + 32 + 32 * i)?);
    }
    Ok(out)
}

// Internal (non-ABI) helpers.
impl MetaMultiSigWallet {
    fn initialize_state(
        &mut self,
        zkv_contract: Address,
        vk_hash: B256,
        poseidon_t3: Address,
        chain_id: U256,
        initial_commitments: Vec<U256>,
        signatures_required: U256,
    ) -> Result<(), Error> {
        if self.initialized.get() {
            return Err(err("Already initialized"));
        }
        if zkv_contract.is_zero() {
            return Err(err("Invalid zkv address"));
        }
        if poseidon_t3.is_zero() {
            return Err(err("Invalid poseidon address"));
        }
        if signatures_required.is_zero() {
            return Err(err("Must be non-zero sigs required"));
        }
        if initial_commitments.is_empty() {
            return Err(err("Need at least 1 signer"));
        }
        if signatures_required > U256::from(initial_commitments.len()) {
            return Err(err("Sigs required too high"));
        }

        self.zkv_contract.set(zkv_contract);
        self.vk_hash.set(vk_hash);
        self.poseidon_t3.set(poseidon_t3);
        self.chain_id.set(chain_id);
        self.signatures_required.set(signatures_required);

        for c in initial_commitments.iter() {
            if c.is_zero() {
                return Err(err("Invalid commitment"));
            }
            self.commitments.push(*c);
        }

        self.initialized.set(true);
        Ok(())
    }

    fn only_self(&self) -> Result<(), Error> {
        if self.vm().msg_sender() != self.vm().contract_address() {
            return Err(err("Not Self"));
        }
        Ok(())
    }

    fn is_current_signer(&self, commitment: U256) -> bool {
        let len = self.commitments.len();
        for i in 0..len {
            if self.commitments.get(i).unwrap() == commitment {
                return true;
            }
        }
        false
    }

    // keccak256(abi.encodePacked(address(this), chainId, nonce, to, value, data))
    fn compute_tx_hash(&self, nonce: U256, to: Address, value: U256, data: &[u8]) -> B256 {
        let mut packed: Vec<u8> = Vec::with_capacity(20 + 32 + 32 + 20 + 32 + data.len());
        packed.extend_from_slice(self.vm().contract_address().as_slice());
        packed.extend_from_slice(&self.chain_id.get().to_be_bytes::<32>());
        packed.extend_from_slice(&nonce.to_be_bytes::<32>());
        packed.extend_from_slice(to.as_slice());
        packed.extend_from_slice(&value.to_be_bytes::<32>());
        packed.extend_from_slice(data);
        keccak(&packed)
    }

    fn poseidon_hash2_internal(&mut self, a: U256, b: U256) -> Result<U256, Error> {
        let safe_a = a % BN254_PRIME;
        let safe_b = b % BN254_PRIME;
        // hash(uint256[2]) — static array, encoded inline as two words.
        let mut cd = Vec::with_capacity(68);
        cd.extend_from_slice(&[0x56, 0x15, 0x58, 0xfe]);
        cd.extend_from_slice(&safe_a.to_be_bytes::<32>());
        cd.extend_from_slice(&safe_b.to_be_bytes::<32>());
        let ret = static_call(self.vm(), Call::new(), self.poseidon_t3.get(), &cd)
            .map_err(|_| err("Poseidon call failed"))?;
        if ret.len() < 32 {
            return Err(err("Poseidon call failed"));
        }
        Ok(U256::from_be_slice(&ret[..32]))
    }

    fn verify_proof(&mut self, tx_hash: B256, proof: &ZkProof) -> Result<bool, Error> {
        // tx_hash_commitment = poseidonHash2(uint256(txHash), 1)
        let tx_hash_u = U256::from_be_bytes(tx_hash.0);
        let tx_hash_commitment = self.poseidon_hash2_internal(tx_hash_u, U256::from(1))?;

        // Public inputs order: tx_hash_commitment, commitment, nullifier.
        let mut encoded_inputs: Vec<u8> = Vec::with_capacity(96);
        encoded_inputs.extend_from_slice(&tx_hash_commitment.to_be_bytes::<32>());
        encoded_inputs.extend_from_slice(&proof.commitment.to_be_bytes::<32>());
        encoded_inputs.extend_from_slice(&proof.nullifier.to_be_bytes::<32>());
        let inputs_hash = keccak(&encoded_inputs);

        // leaf = keccak256(abi.encodePacked(PROVING_SYSTEM_ID, vkHash, VERSION_HASH, keccak(encodedInputs)))
        let proving_system_id = keccak(b"ultrahonk");
        let vk_hash = self.vk_hash.get();
        let mut leaf_pre: Vec<u8> = Vec::with_capacity(128);
        leaf_pre.extend_from_slice(proving_system_id.as_slice());
        leaf_pre.extend_from_slice(vk_hash.as_slice());
        leaf_pre.extend_from_slice(VERSION_HASH.as_slice());
        leaf_pre.extend_from_slice(inputs_hash.as_slice());
        let leaf = keccak(&leaf_pre);

        // verifyProofAggregation(uint256,uint256,bytes32,bytes32[],uint256,uint256)
        // Head is 6 words; the bytes32[] is at offset 0xC0, then length + elements.
        let mp = &proof.zkMerklePath;
        let mut cd = Vec::with_capacity(4 + 32 * 7 + 32 * mp.len());
        cd.extend_from_slice(&[0xa7, 0x8f, 0x9e, 0x36]);
        cd.extend_from_slice(&proof.domainId.to_be_bytes::<32>());
        cd.extend_from_slice(&proof.aggregationId.to_be_bytes::<32>());
        cd.extend_from_slice(leaf.as_slice());
        cd.extend_from_slice(&U256::from(0xC0).to_be_bytes::<32>());
        cd.extend_from_slice(&proof.leafCount.to_be_bytes::<32>());
        cd.extend_from_slice(&proof.index.to_be_bytes::<32>());
        cd.extend_from_slice(&U256::from(mp.len()).to_be_bytes::<32>());
        for w in mp.iter() {
            cd.extend_from_slice(w.as_slice());
        }
        let ret = static_call(self.vm(), Call::new(), self.zkv_contract.get(), &cd)
            .map_err(|_| err("Verifier call failed"))?;
        Ok(ret.len() == 32 && ret[31] != 0)
    }
}

// ============================================================================
// Unit tests — exercise the execute() self-call dispatcher in isolation.
//
// The reported bug: add/remove signer and updateSignaturesRequired submitted
// through execute() reverted, while batchTransfer worked. execute() routes a
// self-call (to == address(this)) through dispatch_self_call(), which selects
// the onlySelf *_internal helper by 4-byte selector and hand-rolls the
// Solidity ABI decode (no full alloy codec, to keep WASM size down). These
// tests feed canonical ABI-encoded calldata straight into dispatch_self_call
// and assert the storage mutation, covering exactly the decode + routing path
// that was suspected broken. The ZK-proof gating in execute() is orthogonal
// (it only guards entry) so it is not needed here.
// ============================================================================
#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    fn word(v: U256) -> [u8; 32] {
        v.to_be_bytes::<32>()
    }

    // ABI-encode `f(uint256[],uint256)` calldata (addSigners / removeSigners).
    fn calldata_u256arr_u256(selector: [u8; 4], arr: &[U256], tail: U256) -> Vec<u8> {
        let mut d = Vec::from(selector);
        d.extend_from_slice(&word(U256::from(0x40))); // offset to the array
        d.extend_from_slice(&word(tail)); // the static uint256
        d.extend_from_slice(&word(U256::from(arr.len())));
        for c in arr {
            d.extend_from_slice(&word(*c));
        }
        d
    }

    // ABI-encode `updateSignaturesRequired(uint256)` calldata.
    fn calldata_update_sig(sig: U256) -> Vec<u8> {
        let mut d = vec![0x30, 0x34, 0xa7, 0x42];
        d.extend_from_slice(&word(sig));
        d
    }

    fn fresh_wallet(vm: &TestVM, commitments: &[U256], sig_required: u64) -> MetaMultiSigWallet {
        let mut c = MetaMultiSigWallet::from(vm);
        let r = c.initialize_state(
            Address::from([0x11; 20]), // zkv (non-zero)
            B256::ZERO,
            Address::from([0x22; 20]), // poseidon (non-zero)
            U256::from(421614),
            commitments.to_vec(),
            U256::from(sig_required),
        );
        assert!(r.is_ok(), "init failed");
        c
    }

    fn read_commitments(c: &MetaMultiSigWallet) -> Vec<U256> {
        let len = c.commitments.len();
        (0..len).map(|i| c.commitments.get(i).unwrap()).collect()
    }

    #[test]
    fn add_signers_via_dispatch_updates_storage() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22)], 1);

        // addSigners([33], 2) — selector 0xa8d2c852
        let data = calldata_u256arr_u256([0xa8, 0xd2, 0xc8, 0x52], &[U256::from(33)], U256::from(2));
        assert!(c.dispatch_self_call(&data).is_ok(), "addSigners dispatch");

        assert_eq!(read_commitments(&c), vec![U256::from(11), U256::from(22), U256::from(33)]);
        assert_eq!(c.signatures_required.get(), U256::from(2));
    }

    #[test]
    fn remove_signers_via_dispatch_updates_storage() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22), U256::from(33)], 1);

        // removeSigners([22], 2) — selector 0x4791ca34. Internal uses swap-with-last + pop.
        let data = calldata_u256arr_u256([0x47, 0x91, 0xca, 0x34], &[U256::from(22)], U256::from(2));
        assert!(c.dispatch_self_call(&data).is_ok(), "removeSigners dispatch");

        let got = read_commitments(&c);
        assert_eq!(got.len(), 2);
        assert!(got.contains(&U256::from(11)) && got.contains(&U256::from(33)));
        assert!(!got.contains(&U256::from(22)));
        assert_eq!(c.signatures_required.get(), U256::from(2));
    }

    #[test]
    fn update_signatures_required_via_dispatch() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22), U256::from(33)], 1);

        assert!(
            c.dispatch_self_call(&calldata_update_sig(U256::from(3))).is_ok(),
            "updateSignaturesRequired dispatch",
        );
        assert_eq!(c.signatures_required.get(), U256::from(3));
    }

    #[test]
    fn update_signatures_required_rejects_above_signer_count() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22)], 1);

        // 3 > 2 signers must revert and leave signatures_required untouched.
        let res = c.dispatch_self_call(&calldata_update_sig(U256::from(3)));
        assert!(res.is_err());
        assert_eq!(c.signatures_required.get(), U256::from(1));
    }

    #[test]
    fn add_signers_rejects_duplicate_commitment() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22)], 1);

        // 22 already a signer -> "Commitment exists".
        let data = calldata_u256arr_u256([0xa8, 0xd2, 0xc8, 0x52], &[U256::from(22)], U256::from(2));
        assert!(c.dispatch_self_call(&data).is_err());
        assert_eq!(read_commitments(&c).len(), 2);
    }

    #[test]
    fn unknown_selector_is_rejected() {
        let vm = TestVM::default();
        let mut c = fresh_wallet(&vm, &[U256::from(11), U256::from(22)], 1);

        let data = vec![0xde, 0xad, 0xbe, 0xef, 0x00, 0x00, 0x00, 0x00];
        assert!(c.dispatch_self_call(&data).is_err());
    }
}