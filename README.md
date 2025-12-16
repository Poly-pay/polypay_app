# Private Multi-Signature Wallet using zkVerify

A privacy-preserving multi-signature wallet that uses zero-knowledge proofs to enable anonymous transaction signing. Instead of storing owner addresses on-chain, the system stores commitments (hash of user's secret), ensuring no one knows who the actual signers are.

## Table of Contents

- [Overview](#overview)
- [Video Demo](#video-demo)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Circuit Compilation](#circuit-compilation)
- [User Workflow](#user-workflow)

## Overview

Traditional multisig wallets expose owner addresses publicly on the blockchain. This system replaces addresses with commitments - cryptographic hashes of user secrets. When signing transactions, users generate ZK proofs to prove they are authorized signers without revealing their identity or position in the signer list.

## Video Demo

Go below link to see:
[Click here](https://app.screencastify.com/watch/GdsEYGKAjUl8o02KKwlA?checkOrg=18c50a97-8f7c-4641-a685-cc49f2d0c450)

## Features

- **Anonymous Signing**: No public exposure of signer addresses
- **Zero-Knowledge Proofs**: Prove authorization without revealing identity
- **zkVerify Integration**: Cost-effective proof verification and aggregation
- **Multiple Actions**: Add/remove signers, transfer ETH, and batch transfers
- **Batch Transfer**: Send ETH to multiple recipients in a single transaction
- **Address Book**: Save and manage contacts per wallet
- **Contact Groups**: Organize contacts into groups for easy management

## How It Works

### What The Circuit Proves

The Noir circuit proves that:

1. The prover knows a valid ECDSA signature for tx_hash
2. The prover is a member of the authorized signers group (merkle tree)
3. The prover has not signed this transaction before (nullifier)

### Circuit Inputs

**Private Inputs (hidden):**

- `signature` - ECDSA signature (r, s) without recovery byte
- `pub_key_x, pub_key_y` - Public key coordinates (recovered from signature)
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
│                     │  4. POST /api/wallets     │                     │
│   User (Creator)    │  ───────────────────────▶ │   Backend           │
│                     │     (commitments[],       │   (Relayer Wallet)  │
│                     │      threshold)           │                     │
└─────────────────────┘                           └─────────────────────┘
                                                            │
                                                            │ 5. Deploy contract
                                                            │    with commitments
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │   Smart Contract    │
                                                  │ (MetaMultiSigWallet)│
                                                  │                     │
                                                  │ 6. Build Merkle Tree│
                                                  │    Store Merkle Root│
                                                  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
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

┌─────────────────────┐  1. POST /api/transactions/:txId/execute
│                     │  ───────────────────────▶ ┌─────────────────────┐
│   Anyone            │                           │                     │
│   (trigger only)    │                           │   Backend           │
│                     │                           │   (Relayer Wallet)  │
└─────────────────────┘                           │                     │
                                                  │  2. Prepare proofs  │
                                                  │  3. Check balance   │
                                                  └─────────────────────┘
                                                            │
                                                            │ 4. execute(to, value,
                                                            │    data, zkProofs[])
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │                     │
                                                  │   Smart Contract    │
                                                  │                     │
                                                  │  5. Loop & verify   │
                                                  │     each proof      │
                                                  │  6. Check nullifiers│
                                                  │  7. Execute action  │
                                                  │  8. Emit event      │
                                                  └─────────────────────┘
                                                            │
                                                            │ 9. Return tx result
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │   Backend updates   │
                                                  │   status = EXECUTED │
                                                  │   txHash = result   │
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
- **Batch Transfer** - Send ETH to multiple recipients in one transaction 

All actions require `signaturesRequired` anonymous signatures before execution.

## Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- Docker & Docker Compose (for Docker setup)
- Noir toolchain v1.0.0-beta.12 (for circuit compilation only)

### Installing Noir

```bash
# Install Noir using noirup
noirup -v 1.0.0-beta.12
```

> ⚠️ **Important**: You must use version 1.0.0-beta.12 specifically. Newer versions may not be compatible with the current circuit implementation.

## Quick Start

> **Note**: Must run on testnet - zkVerify verification does not work on localhost.

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone git@github.com:Poly-pay/polypay_app.git
cd polypay_app

# 2. Setup environment
cp docker/.env.example docker/.env
# Edit docker/.env and fill in:
# - POSTGRES_PASSWORD
# - RELAYER_ZKVERIFY_API_KEY
# - RELAYER_WALLET_KEY

# 3. Run with Docker Compose
cd docker
docker compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
```

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone clone git@github.com:Poly-pay/polypay_app.git
cd polypay_app

# 2. Install dependencies
yarn install

# 3. Build application
yarn build

# 4. Frontend Setup
cp packages/nextjs/.env.example packages/nextjs/.env

# 5. Backend Setup
cd packages/backend

# Start PostgreSQL with Docker
docker compose up -d postgres

# Setup environment
cp .env.example .env
# Edit .env and fill in your keys

# Run database migrations
npx prisma migrate dev
npx prisma generate

cd ../..

# 6. Run the Application
# Terminal 1: Start backend
yarn start:backend

# Terminal 2: Start frontend
yarn start:frontend
```

## Project Structure
```
├── packages/
│   ├── shared/          # Shared types, DTOs, and utilities
│   ├── backend/         # NestJS API server
│   ├── nextjs/          # Next.js frontend
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── docker-compose.yml
└── README.md
```

## Environment Variables
### Backend (.env)

- **POSTGRES_PASSWORD** - PostgreSQL database password
- **DATABASE_URL** - PostgreSQL connection string
- **RELAYER_ZKVERIFY_API_KEY** - API key for zkVerify relayer
- **RELAYER_WALLET_KEY** - Private key for relayer wallet

### Frontend (.env)

- **NEXT_PUBLIC_API_URL** - Backend API URL

### Getting zkVerify API Key

- **Testnet**: Visit https://relayer-testnet.horizenlabs.io/
- **Mainnet**: Visit https://relayer.horizenlabs.io/

## Circuit Compilation
Only needed if you modify the Noir circuit:

```bash
cd packages/nextjs/public/circuit
nargo compile
```

## User Workflow

1. **Generate Identity** → Sign message to derive secret, compute commitment
2. **Register as Signer** → Share commitment with admin, admin adds to wallet
3. **Propose Transaction** → Create tx (transfer, batch, add/remove signer), sign + generate ZK proof
4. **Submit to Backend** → Backend saves tx + proof, submits proof to zkVerify for aggregation
5. **Sign (Other Signers)** → Generate ZK proof and submit to backend via /api/transactions/:txId/approve
6. **Execute** → When threshold reached, call execute() and backend will fetch all proof then call smart contract