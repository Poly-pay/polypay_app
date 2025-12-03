# Private Multi-Signature Wallet using zkVerify

A privacy-preserving multi-signature wallet that uses zero-knowledge proofs to enable anonymous transaction signing. Instead of storing owner addresses on-chain, the system stores commitments (hash of user's secret), ensuring no one knows who the actual signers are.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Circuit Details](#circuit-details)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

## Overview

Traditional multisig wallets expose owner addresses publicly on the blockchain. This system replaces addresses with commitments - cryptographic hashes of user secrets. When signing transactions, users generate ZK proofs to prove they are authorized signers without revealing their identity or position in the signer list.

## Features

- **Anonymous Signing**: No public exposure of signer addresses
- **Zero-Knowledge Proofs**: Prove authorization without revealing identity
- **zkVerify Integration**: Cost-effective proof verification and aggregation
- **Multiple Actions**: Add/remove signers and transfer ETH

## How It Works

### What The Circuit Proves

The Noir circuit proves that:
1. The prover knows a valid ECDSA signature for tx_hash
2. The prover is a member of the authorized signers group (merkle tree)
3. The prover has not signed this transaction before (nullifier)

### Circuit Inputs

**Private Inputs (hidden):**
- `signature` - ECDSA signature (r, s) without recovery byte
- `pub_key_x`, `pub_key_y` - Public key coordinates (recovered from signature)
- `secret` - Signer's secret (derived from signing "noir-identity" message)
- `leaf_index` - Position of signer's commitment in merkle tree
- `merkle_path` - Sibling hashes for merkle proof
- `tx_hash_bytes` - Transaction hash to be signed

**Public Inputs (visible):**
- `tx_hash_commitment` - Poseidon hash of tx_hash (for public verification)
- `merkle_root` - Root of authorized signers tree
- `nullifier` - Unique identifier to prevent double-signing

## Architecture

### High Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SETUP PHASE (One-time)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                           ┌─────────────────────┐
│                     │  1. Generate secret       │                     │
│   User (Signer)     │  ───────────────────────▶ │   LocalStorage      │
│                     │  2. Compute commitment    │   (secret stored)   │
└─────────────────────┘     = hash(secret,secret) └─────────────────────┘
           │
           │ 3. Share commitment (off-chain, like sharing address)
           ▼
┌─────────────────────┐                           ┌─────────────────────┐
│                     │  4. Add commitment        │                     │
│   Admin/Owner       │  ───────────────────────▶ │   Smart Contract    │
│                     │                           │ (MetaMultiSigWallet)│
└─────────────────────┘                           └─────────────────────┘
                                                            │
                                                            │ 5. Build Merkle Tree
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │   Merkle Root       │
                                                  │   (on-chain)        │
                                                  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROPOSE & SIGN FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  1. Create tx data        ┌─────────────────────┐
│                     │     - Add signer          │                     │
│   User (Signer)     │     - Remove signer       │   Generate:         │
│                     │     - Transfer ETH        │   - txHash          │
│                     │  ───────────────────────▶ │   - nullifier       │
│                     │                           │   - txHashCommitment│
└─────────────────────┘                           └─────────────────────┘
           │
           │ 2. Sign txHash (ECDSA) + Generate ZK Proof
           ▼
┌─────────────────────┐                           ┌─────────────────────┐
│   Noir Circuit      │  Proves:                  │                     │
│   (in browser)      │  ✓ Valid ECDSA signature  │   /api/relayer      │
│                     │  ✓ Member of signer group │   (Next.js API)     │
│                     │  ✓ Unique nullifier       │                     │
└─────────────────────┘                           └─────────────────────┘
           │                                                │
           │ 3. Send proof                                  │ 4. Submit to zkVerify
           │────────────────────────────────────────────────▶   (RELAYER_API_KEY)
           │                                                │
           │                                                ▼
           │                                      ┌─────────────────────┐
           │                                      │   zkVerify Relayer  │
           │                                      │   (Horizen Labs)    │
           │                                      │                     │
           │                                      │   5. Verify proof   │
           │                                      │   6. Aggregate      │
           │                                      └─────────────────────┘
           │                                                │
           │◀───────────────────────────────────────────────│
           │         7. Return aggregation_detail           │
           │
           │ 8. Build args + Call proposeTx()
           ▼
┌─────────────────────┐                           ┌─────────────────────┐
│                     │                           │                     │
│   User's Wallet     │  ───────────────────────▶ │   Smart Contract    │
│   (MetaMask)        │                           │                     │
│                     │                           │  9. Verify zkVerify │
└─────────────────────┘                           │     attestation     │
                                                  │ 10. Check nullifier │
                                                  │ 11. Count signature │
                                                  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION PHASE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                           ┌─────────────────────┐
│                     │  When enough signatures   │                     │
│   Anyone            │  ───────────────────────▶ │   Smart Contract    │
│                     │  executeTx(txId)          │   Execute! ✅       │
└─────────────────────┘                           └─────────────────────┘
```

### Components

- **Smart Contract** - Stores commitments (not addresses), builds Merkle tree, verifies proofs via zkVerify attestation, executes transactions
- **Noir Circuit** - Proves signature validity + Merkle membership + nullifier uniqueness, all without revealing signer identity
- **zkVerify** - Horizen Labs service for proof verification and aggregation, reduces gas costs
- **Frontend** - Next.js app for identity creation, transaction proposal, and ZK proof generation in browser
- **API Relayer** - `/api/relayer` endpoint that submits proofs to zkVerify and returns attestation details

### Supported Actions

- **Add Signer** - Add new commitment to the authorized signers list
- **Remove Signer** - Remove commitment from signers list  
- **Transfer ETH** - Send ETH from multisig wallet to recipient

All actions require `signaturesRequired` anonymous signatures before execution.

## Prerequisites

- **Node.js** (v18 or higher)
- **Yarn** package manager
- **Noir toolchain** (version 1.0.0-beta.12 specifically)

### Installing Noir

```bash
# Install Noir using noirup
noirup -v 1.0.0-beta.12
```

> ⚠️ **Important**: You must use version 1.0.0-beta.12 specifically. Newer versions may not be compatible with the current circuit implementation.

## Installation

### Quick Start (Testnet)

> **Note**: Must run on testnet - zkVerify verification does not work on localhost.

```bash
# 1. Clone the repository
git clone git@github.com:Poly-pay/polypay_multisig.git
cd polypay_multisig

# 2. Install dependencies
yarn install

# 3. Setup environment
# .env.example already contains working RELAYER_ZKVERIFY_API_KEY for testnet
cp packages/nextjs/.env.example packages/nextjs/.env

# 4. Compile the circuit (if needed)
cd packages/nextjs/public/circuit
nargo compile
cd ../../../..

# 5. Start the application
yarn start
```

> **Note**: A multisig wallet with signers is already deployed on Sepolia testnet.

### Environment Variables

- **RELAYER_ZKVERIFY_API_KEY** - API key for zkVerify relayer (Currently using testnet)
  - For Testnet: Visit https://relayer-testnet.horizenlabs.io/
  - For Mainnet: Visit https://relayer.horizenlabs.io/

## Usage

### User Workflow

1. **Generate Identity** → Sign message to derive secret, compute commitment
2. **Register as Signer** → Share commitment with admin, admin adds to contract
3. **Propose Transaction** → Create tx (add/remove signer or transfer), sign + generate ZK proof
4. **Submit Proof** → API sends to zkVerify, receives attestation
5. **Call Contract** → Submit attestation to smart contract, signature counted
6. **Execute** → When enough signatures, anyone calls `executeTx()`