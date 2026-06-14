# Introduction

### What is PolyPay?

PolyPay is a privacy-preserving payroll platform built on Horizen and Base. It enables organizations, DAOs, and global teams to run payroll privately across multiple chains.

### The Problem

Current on-chain payment solutions expose sensitive information publicly:

* Employee salaries are visible to everyone
* Payment recipients can be tracked
* Multisig approvers are publicly identified

This lack of privacy prevents businesses from adopting crypto payroll.

### Our Solution

PolyPay uses **zero-knowledge proofs** and **multi-chain deployment** (Horizen, Base, and Arbitrum) to provide:

* **Private Multisig**: Team approvals without exposing signer identities — only a relayer wallet appears on-chain
* **ZK Authentication**: Login via zero-knowledge proof; secrets never leave your device
* **Flexible Payment Logic**: Single and batch transfers
* **Gasless USDC Deposit (x402)**: Fund a multisig with one signature, no ETH required — works for human users and AI agents via the [x402 protocol](https://www.x402.org/)

> **On the roadmap:** confidential payment amounts and recipients ("private payments"). Today's ZK privacy covers signer identities and authentication; we're actively building toward fully private transfers.

### Who Is It For?

* Crypto-native startups and SMBs
* DAOs managing contributor payments
* Traditional businesses entering crypto
* Teams using Safe or Squads who want privacy upgrades

### Supported Networks

* **Horizen** (mainnet & testnet)
* **Base** (mainnet & Sepolia)
* **Arbitrum** (Arbitrum One mainnet & Sepolia; account contract is a Rust/WASM port via [Arbitrum Stylus](arbitrum-stylus.md))

### Roadmap

* Additional chain integrations
* Fiat on/off-ramp integration
* Escrow and milestone-based payments
* Recurring transfers
* Expand x402 to additional networks and tokens beyond USDC on Base
