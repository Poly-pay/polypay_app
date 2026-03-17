# Developer Documentation

Technical documentation for developers who want to understand, contribute to, or integrate with PolyPay.

## Contents

This section covers:

- [Getting Started](getting-started.md) - Prerequisites, setup, and running the project locally
- [Database Connection Guide](database-connection-guide.md) - How to connect and query the PostgreSQL database
- [Circuit Code Walkthrough](circuit-code-walkthrough.md) - Detailed explanation of the Noir ZK circuit
- [Private Transfer Flow](private-transfer-flow.md) - End-to-end technical flow of the mixer / private transfer feature

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | [Next.js](https://nextjs.org) + [wagmi](https://wagmi.sh) |
| Backend | [NestJS](https://nestjs.com) + [Prisma](https://prisma.io) |
| Smart Contract | [Solidity](https://soliditylang.org) + [Hardhat](https://hardhat.org) |
| ZK Circuit | [Noir](https://noir-lang.org) |
| Proof Verification | [zkVerify](https://docs.zkverify.io) |
| Database | [PostgreSQL](https://www.postgresql.org) |

## Supported Networks

| Network | Type | Chain ID | Explorer |
|---------|------|----------|----------|
| Horizen | Mainnet | 26514 | [horizen.calderaexplorer.xyz](https://horizen.calderaexplorer.xyz/) |
| Horizen | Testnet | 2651420 | [horizen-testnet.explorer.caldera.xyz](https://horizen-testnet.explorer.caldera.xyz/) |
| Base | Mainnet | 8453 | [basescan.org](https://basescan.org/) |
| Base | Sepolia | 84532 | [sepolia.basescan.org](https://sepolia.basescan.org/) |

## Quick Links

- [GitHub Repository](https://github.com/Poly-pay/polypay_app)
- [Smart Contract on Horizen testnet](https://horizen-testnet.explorer.caldera.xyz/)
- [Smart Contract on Base Sepolia](https://sepolia.basescan.org/)
