# PolyPay

A privacy-preserving payroll platform built on Horizen. PolyPay enables organizations, DAOs, and global teams to run payroll privately while staying on their preferred blockchain.

<!-- ## Demo -->

<!-- 🎬 **Video Demo**: [Click here](https://app.screencastify.com/watch/GdsEYGKAjUl8o02KKwlA?checkOrg=18c50a97-8f7c-4641-a685-cc49f2d0c450) -->

<!-- 🌐 **Live Demo**: [https://polypay.app](https://polypay.app) -->

## Features

- **Private Multisig**: Team approvals without exposing signer identities — only a relayer wallet appears on-chain
- **ZK Authentication**: Login via zero-knowledge proof; secrets never leave your device
- **Batch Payroll**: Single and batch transfers

> **Roadmap:** Confidential payment amounts and recipients ("private payments") are in active development — not yet live. Today's privacy guarantee covers signer identities.

## Quick Start

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

## Documentation

For full documentation, visit: **[PolyPay Docs](https://q3labs.gitbook.io/polypay)**

- [Getting Started](https://q3labs.gitbook.io/polypay/getting-started)
- [Privacy Architecture](https://q3labs.gitbook.io/polypay/privacy-architecture)
- [Zero-Knowledge Implementation](https://q3labs.gitbook.io/polypay/zero-knowledge-implementation)
- [System Architecture](https://q3labs.gitbook.io/polypay/architecture)
