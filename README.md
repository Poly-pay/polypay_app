# Private Multi-Signature Wallet using zkVerify

A privacy-preserving multi-signature wallet that uses zero-knowledge proofs to enable anonymous transaction signing. Instead of storing owner addresses on-chain, the system stores commitments (hash of user's secret), ensuring no one knows who the actual signers are.

## Table of Contents

- [Overview](#overview)
- [Video demo](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)

## Overview

Traditional multisig wallets expose owner addresses publicly on the blockchain. This system replaces addresses with commitments - cryptographic hashes of user secrets. When signing transactions, users generate ZK proofs to prove they are authorized signers without revealing their identity or position in the signer list.

## Video demo
Go below link to see: 
https://app.screencastify.com/manage/videos/GdsEYGKAjUl8o02KKwlA

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

─────────────────────────────────────────────────────────────────────────────┐
│                         PROPOSE & SIGN FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  1. Create tx data        ┌─────────────────────┐
│                     │     (to, value, type)     │                     │
│   Proposer          │  ───────────────────────▶ │   Generate:         │
│   (Signer)          │                           │   - txHash          │
│                     │  2. Generate ZK Proof     │   - nullifier       │
│                     │     in browser            │   - proof           │
└─────────────────────┘                           └─────────────────────┘
           │
           │ 3. POST /api/transactions (tx data + proof)
           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              Backend                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. Save transaction + first proof                                  │   │
│  │  5. Submit proof to zkVerify → get aggregation data                 │   │
│  │  6. Check: approveCount >= threshold?                               │   │
│  │     - No  → status = PENDING (wait for more signatures)             │   │
│  │     - Yes → status = EXECUTING (ready to execute)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
           │
           │ If PENDING, other signers can approve:
           ▼
┌─────────────────────┐                           ┌─────────────────────┐
│                     │  7. Generate ZK Proof     │                     │
│   Other Signers     │  ───────────────────────▶ │   POST /api/        │
│                     │                           │   transactions/     │
│                     │                           │   :txId/approve     │
└─────────────────────┘                           └─────────────────────┘
                                                            │
                                                            │ 8. Save proof
                                                            │ 9. Submit to zkVerify
                                                            │ 10. Check threshold
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │   When threshold    │
                                                  │   reached →         │
                                                  │   status=EXECUTING  │
                                                  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION PHASE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  1. GET /api/transactions/:txId/execute
│                     │  ───────────────────────▶ ┌─────────────────────┐
│   Anyone            │                           │   Backend returns:  │
│   (usually last     │ ◀───────────────────────  │   - All aggregated  │
│    signer)          │  2. Array of zkProofs     │     proofs          │
│                     │     + execution params    │   - to, value, data │
└─────────────────────┘                           └─────────────────────┘
           │
           │ 3. Call smart contract with all proofs
           ▼
┌─────────────────────┐                           ┌─────────────────────┐
│                     │  execute(to, value,       │                     │
│   User's Wallet     │   data, zkProofs[])       │   Smart Contract    │
│   (MetaMask)        │  ───────────────────────▶ │                     │
│                     │                           │  4. Loop & verify   │
└─────────────────────┘                           │     each proof      │
                                                  │  5. Check nullifiers│
                                                  │  6. Execute action  │
                                                  │  7. Emit event      │
                                                  └─────────────────────┘
           │
           │ 8. PATCH /api/transactions/:txId/executed
           ▼
┌─────────────────────┐
│   Backend updates   │
│   status = EXECUTED │
└─────────────────────┘
```

### Components

- **Smart Contract** - Stores commitments (not addresses), builds Merkle tree, verifies proofs via zkVerify attestation, executes transactions
- **Noir Circuit** - Proves signature validity + Merkle membership + nullifier uniqueness, all without revealing signer identity
- **zkVerify** - Horizen Labs service for proof verification and aggregation, reduces gas costs
- **Frontend** - Next.js app for identity creation, transaction proposal, and ZK proof generation in browser
- **Backend** - NestJS API that stores transactions & proofs, submits to zkVerify, tracks approval status

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

# 3. Frontend Setup
# Copy environment file (contains API URL pointing to localhost:4000)
cp packages/nextjs/.env.example packages/nextjs/.env

# 4. Backend Setup
cd packages/backend
docker compose up -d postgres

# Copy environment file (pre-configured, no changes needed)
cp .env.example .env

# Run database migrations
npx prisma migrate dev
npx prisma generate

cd ../..

# 5. Run the Application
# Start frontend (Next.js)
yarn start:frontend

# Start backend (NestJS) - in another terminal
yarn start:backend

# Now you open your localhost, connect yor wallet, then copy your commitment
# After copy Commitment, you need go to file 00_deploy_meta_multisig_wallet.ts then paste your commitment to args
# Then deploy your smart contract with script
yarn deploy --network sepolia --reset
```

> **Note**: A multisig wallet with signers is already deployed on Sepolia testnet.

### Environment Variables

- **RELAYER_ZKVERIFY_API_KEY** - API key for zkVerify relayer (Currently using testnet)
  - For Testnet: Visit https://relayer-testnet.horizenlabs.io/
  - For Mainnet: Visit https://relayer.horizenlabs.io/

### Circuit Compilation (For Developers Only)
Only needed if you modify the Noir circuit: 
```bash
cd packages/nextjs/public/circuit
nargo compile
cd ../../../..
 ```

## User Workflow

1. **Generate Identity** → Sign message to derive secret, compute commitment
2. **Register as Signer** → Share commitment with admin, admin adds to contract
3. **Propose Transaction** → Create tx (add/remove signer or transfer), sign + generate ZK proof
4. **Submit to Backend** → Backend saves tx + proof, submits proof to zkVerify for aggregation
5. **Sign (Other Signers)** → Generate ZK proof and submit to backend via /api/transactions/:txId/approve
6. **Execute** → When threshold reached, fetch all proofs from backend, call execute() on smart contract