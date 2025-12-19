# Zero-Knowledge Implementation

## Why Zero-Knowledge?

Imagine you want to enter a bar that requires you to be 18+.

**Traditional way:** Show your ID card → Bartender sees your name, address, exact birthday.

**Zero-Knowledge way:** Prove "I am 18+" without revealing anything else.

### How PolyPay Uses This

In a traditional multisig wallet:
- Everyone sees WHO signed each transaction
- Signer addresses are public on blockchain

In PolyPay:
- You prove "I am an authorized signer" without revealing WHICH signer you are
- Only the proof is public, your identity stays private

## The Four Proofs

When you sign a transaction in PolyPay, the ZK circuit proves four things simultaneously. The circuit is written in [Noir](https://noir-lang.org), a domain-specific language for zero-knowledge proofs, and compiled to [UltraPlonk](https://rknhr-uec.github.io/aztec-protocol-spec/protocol-specs/cryptography/proving-system/overview) for efficient verification.

### Proof 1: "I know the transaction"

**Problem:** We need to verify you're signing the correct transaction, not a fake one.

**Solution:** You provide a "fingerprint" (hash) of the transaction using [Poseidon Hash](https://www.poseidon-hash.info). The circuit checks this fingerprint matches.

**Analogy:** Like a sealed envelope - you prove the content inside matches what's expected.

**Why Poseidon?** [zkVerify](https://docs.zkverify.io) limits public inputs to 32 fields. Since transaction hash is 32 bytes, we compress it into a single field using Poseidon hash.

### Proof 2: "I signed it"

**Problem:** Anyone could claim they signed a transaction.

**Solution:** The circuit verifies your [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) signature is valid - the same signature standard Ethereum uses.

**Analogy:** Like your handwritten signature - unique to you and verifiable.

**Technical note:** Ethereum's `personal_sign` adds a prefix `"\x19Ethereum Signed Message:\n32"` before signing. The circuit reconstructs this prefixed message and hashes it with [Keccak256](https://keccak.team/keccak.html) before verification.

### Proof 3: "I am authorized"

**Problem:** How to prove you're in the signers list without revealing which one?

**Solution:**
- Each signer has a secret "commitment" stored as: `commitment = hash(secret, secret)`
- All commitments form a [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree)
- You prove your commitment exists in the tree WITHOUT revealing which leaf

**Analogy:** Imagine a club membership list. You prove "my name is on the list" without pointing to which line.

**How Merkle Proof works:**

You have a tree structure where your commitment is one of the leaves (A, B, C, or D). To prove membership, you provide sibling hashes along the path from your leaf to the root. The circuit computes the root from your path and checks it matches the public root.

### Proof 4: "I haven't signed before"

**Problem:** Same signer could submit multiple proofs for one transaction.

**Solution:**
- Each signature generates a unique "nullifier": `nullifier = hash(secret, tx_hash)`
- Smart contract stores used nullifiers
- Same person + same transaction = same nullifier = rejected

**Analogy:** Like a voting ballot with a unique barcode - you can only use it once.

## Complete Flow

1. **User Signs:** User signs tx_hash with their Ethereum wallet → Produces signature, pub_key_x, pub_key_y

2. **Frontend Generates Proof:** [Noir](https://noir-lang.org) circuit receives private inputs (signature, pub_key, secret, merkle_path, tx_hash) and public inputs (tx_hash_commitment, merkle_root, nullifier) → Outputs ZK Proof

3. **Backend Verifies via zkVerify:** Proof submitted to [zkVerify](https://docs.zkverify.io) for verification → Returns aggregation_id, attestation

4. **Smart Contract Executes:** When threshold signatures reached, contract verifies all proofs on-chain, checks nullifiers not used, checks merkle_root matches current signers, then executes transaction

## Circuit Inputs Reference

### Private Inputs (Hidden from everyone)

| Input | Type | Description |
|-------|------|-------------|
| signature | [u8; 64] | ECDSA signature (r, s) without recovery byte |
| pub_key_x | [u8; 32] | Public key X coordinate |
| pub_key_y | [u8; 32] | Public key Y coordinate |
| secret | Field | Signer's secret (from signing "polypay-identity") |
| leaf_index | Field | Position in Merkle tree |
| merkle_path | [Field; 4] | Sibling hashes for proof |
| tx_hash_bytes | [u8; 32] | Transaction hash to sign |

### Public Inputs (Visible on-chain)

| Input | Type | Description |
|-------|------|-------------|
| tx_hash_commitment | Field | Poseidon hash of tx_hash |
| merkle_root | Field | Root of authorized signers tree |
| nullifier | Field | Prevents double-signing |

## Learn More

- [Noir Language Documentation](https://noir-lang.org/docs)
- [UltraPlonk Proving System](https://docs.aztec.network/aztec/protocol/specifications/proving-system/ultraplonk)
- [zkVerify Documentation](https://docs.zkverify.io)
