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
- You prove "I know the secret for an authorized commitment" without revealing your EOA address
- Your Ethereum address stays private, only the commitment is visible

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

**Problem:** How to prove you're in the signers list?

**Solution:**
- Each signer has a secret "commitment" stored as: `commitment = hash(secret, secret)`
- The circuit proves you know the secret for a given commitment
- The smart contract checks if that commitment exists in the signers list

**Analogy:** Imagine a club membership list. You prove "I know the password for one of these memberships" and the club verifies that membership is on the list.

**How it works:**

The circuit verifies: `hash(secret, secret) == commitment`

Then the smart contract checks: `commitment in signers list?`

This two-step verification ensures only authorized signers can sign transactions while keeping their Ethereum addresses private.

### Proof 4: "I haven't signed before"

**Problem:** Same signer could submit multiple proofs for one transaction.

**Solution:**
- Each signature generates a unique "nullifier": `nullifier = hash(secret, tx_hash)`
- Smart contract stores used nullifiers
- Same person + same transaction = same nullifier = rejected

**Analogy:** Like a voting ballot with a unique barcode - you can only use it once.

## Complete Flow

1. **User Signs:** User signs tx_hash with their Ethereum wallet → Produces signature, pub_key_x, pub_key_y

2. **Frontend Generates Proof:** [Noir](https://noir-lang.org) circuit receives private inputs (signature, pub_key, secret, tx_hash) and public inputs (tx_hash_commitment, commitment, nullifier) → Outputs ZK Proof

3. **Backend Verifies via zkVerify:** Proof submitted to [zkVerify](https://docs.zkverify.io) for verification → Returns aggregation_id, attestation

4. **Smart Contract Executes:** When threshold signatures reached, contract verifies all proofs on-chain, checks nullifiers not used, checks each commitment is in current signers list, then executes transaction

## Circuit Inputs Reference

### Private Inputs (Hidden from everyone)

| Input | Type | Description |
|-------|------|-------------|
| signature | [u8; 64] | ECDSA signature (r, s) without recovery byte |
| pub_key_x | [u8; 32] | Public key X coordinate |
| pub_key_y | [u8; 32] | Public key Y coordinate |
| secret | Field | Signer's secret (from signing "polypay-identity") |
| tx_hash_bytes | [u8; 32] | Transaction hash to sign |

### Public Inputs (Visible on-chain)

| Input | Type | Description |
|-------|------|-------------|
| tx_hash_commitment | Field | Poseidon hash of tx_hash |
| commitment | Field | hash(secret, secret) - checked against signers list |
| nullifier | Field | Prevents double-signing |

## More Detail
- [Circuit Code Walkthrough](developer-documentation/circuit-code-walkthrough.md)

## Learn More

- [Noir Language Documentation](https://noir-lang.org/docs)
- [UltraPlonk Proving System](https://docs.aztec.network/aztec/protocol/specifications/proving-system/ultraplonk)
- [zkVerify Documentation](https://docs.zkverify.io)
