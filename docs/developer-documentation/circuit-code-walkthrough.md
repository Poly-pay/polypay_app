# Circuit Code Walkthrough

This page provides a detailed explanation of the [Noir](https://noir-lang.org) circuit used in PolyPay for generating zero-knowledge proofs.

## Overview

The circuit file is located at `packages/nextjs/public/circuit/src/main.nr`. It proves four things in a single proof: transaction hash commitment is correct, ECDSA signature is valid, prover knows the secret for their commitment, and nullifier prevents double-signing.

## Circuit Structure

### Imports

The circuit uses `keccak256` for Ethereum-compatible message hashing and `poseidon` as a ZK-friendly hash function for commitments and nullifiers.

## Main Function Inputs

### Private Inputs

These inputs are hidden from everyone - only the prover knows them:

| Input | Type | Description |
|-------|------|-------------|
| signature | [u8; 64] | ECDSA signature (r, s) without recovery byte |
| pub_key_x | [u8; 32] | Public key X coordinate |
| pub_key_y | [u8; 32] | Public key Y coordinate |
| secret | Field | Signer's secret |
| tx_hash_bytes | [u8; 32] | Transaction hash to sign |

### Public Inputs

These inputs are visible on-chain and used for verification:

| Input | Type | Description |
|-------|------|-------------|
| tx_hash_commitment | Field | Poseidon hash of tx_hash |
| commitment | Field | hash(secret, secret) - checked against signers list |
| nullifier | Field | Unique identifier to prevent double-signing |

## Step-by-Step Explanation

### Step 1: Verify Transaction Hash Commitment

The circuit converts 32-byte tx_hash to a single Field element, hashes it with Poseidon using `hash(tx_hash, 1)`, then compares with public `tx_hash_commitment`.

**Why?** [zkVerify](https://docs.zkverify.io) limits public inputs to 32 fields. Instead of exposing 32 bytes (32 inputs), we compress to 1 field using [Poseidon hash](https://www.poseidon-hash.info).

### Step 2: Verify ECDSA Signature

The circuit reconstructs Ethereum's `personal_sign` prefix `"\x19Ethereum Signed Message:\n32"`, concatenates prefix + tx_hash (28 + 32 = 60 bytes), hashes with [Keccak256](https://keccak.team/keccak.html), then verifies [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) signature on secp256k1 curve.

**Why prefix?** Ethereum wallets always add this prefix when signing. We must match the exact message that was signed.

### Step 3: Verify Commitment Ownership

The circuit computes commitment from secret using `commitment = hash(secret, secret)`, then compares with public `commitment`.

**How authorization works:** The circuit proves "I know the secret for this commitment". Then the smart contract checks "Is this commitment in the signers list?" This two-step verification ensures only authorized signers can sign transactions.

### Step 4: Verify Nullifier

The circuit computes nullifier using `nullifier = hash(secret, tx_hash)` and compares with public `nullifier`.

**Why?** Same signer + same tx = same nullifier → Contract rejects (already used). Different signer OR different tx = different nullifier → Contract accepts.

## Helper Functions

### bytes_to_field

Converts 32-byte array to single Field element by treating bytes as big-endian number.

### poseidon_hash2

Wrapper for [Poseidon](https://www.poseidon-hash.info) hash with 2 inputs.

## Security Considerations

| Attack | Prevention |
|--------|------------|
| Fake signature | ECDSA verification in circuit |
| Non-member signing | Commitment checked against signers list on-chain |
| Double signing | Nullifier stored on-chain |
| Transaction tampering | tx_hash_commitment verification |
| Replay attack | Nonce included in tx_hash |

## Compile and Test

Navigate to noir package with `cd packages/nextjs/public/circuit/src`, compile circuit with `nargo compile`, run tests with `nargo test`.

## Learn More

- [Noir Language Documentation](https://noir-lang.org/docs)
- [Noir Standard Library](https://noir-lang.org/docs/noir/standard_library)
- [ECDSA in Noir](https://noir-lang.org/docs/noir/standard_library/cryptographic_primitives/ecdsa_sig_verification)
- [Poseidon Hash](https://www.poseidon-hash.info)
