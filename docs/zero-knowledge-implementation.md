# Zero-Knowledge Implementation

### Overview

PolyPay uses a Noir circuit to generate zero-knowledge proofs. The circuit is compiled to UltraPlonk and verified via zkVerify.

### What The Circuit Proves

The ZK proof demonstrates three things simultaneously:

1. **Valid Signature**: The prover knows a valid ECDSA signature for the transaction hash
2. **Membership**: The prover's commitment exists in the authorized signers Merkle tree
3. **No Double-Signing**: The nullifier has not been used before

### Circuit Inputs

#### Private Inputs (Hidden)

| Input                  | Description                     |
| ---------------------- | ------------------------------- |
| `signature`            | ECDSA signature (r, s)          |
| `pub_key_x, pub_key_y` | Public key coordinates          |
| `secret`               | Signer's secret                 |
| `leaf_index`           | Position in Merkle tree         |
| `merkle_path`          | Sibling hashes for Merkle proof |

#### Public Inputs (Visible)

| Input                | Description                                 |
| -------------------- | ------------------------------------------- |
| `tx_hash_commitment` | Poseidon hash of transaction hash           |
| `merkle_root`        | Root of signers Merkle tree                 |
| `nullifier`          | Unique identifier to prevent double-signing |

### Proof Flow

1. User signs transaction hash with their wallet
2. Frontend generates ZK proof using Noir circuit
3. Proof is submitted to backend
4. Backend verifies via zkVerify
5. When threshold reached, proofs are sent to smart contract
6. Contract verifies proofs and executes transaction
