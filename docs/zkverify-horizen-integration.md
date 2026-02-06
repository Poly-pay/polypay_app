# zkVerify & Horizen Integration

## Overview

PolyPay uses two blockchain layers for privacy-preserving multisig operations:

- **zkVerify**: Verifies zero-knowledge proofs off-chain, providing proof verification as a service
- **Horizen**: EVM-compatible L3 blockchain where multisig accounts are deployed and transactions are executed

## Architecture

![Architecture Flow](.gitbook/assets/zkverify-horizen/architecture-flow.png)

## Flows

### 1. Authentication (LOGIN)

User proves ownership of their commitment without revealing the secret.

![Authentication Flow](.gitbook/assets/zkverify-horizen/authentication-flow.png)

- **zkVerify**: Verify poseidon2 proof
- **Horizen**: No interaction

### 2. Account Creation (CREATE_ACCOUNT)

Deploy a new multisig account on Horizen.

![Account Creation Flow](.gitbook/assets/zkverify-horizen/account-creation-flow.png)

- **zkVerify**: No interaction
- **Horizen**: Deploy multisig account contract

### 3. Transaction Lifecycle

#### Propose & Approve

When a user proposes a transaction, they automatically approve it. Other signers can then approve.

![Approve Flow](.gitbook/assets/zkverify-horizen/approve-flow.png)

- **zkVerify**: Verify proof, return job-id
- **Horizen**: No interaction

#### Deny

Deny is simply a "disagree" vote - no proof required, no on-chain interaction.

![Deny Flow](.gitbook/assets/zkverify-horizen/deny-flow.png)

- **zkVerify**: No interaction (no proof needed)
- **Horizen**: No interaction (no gas cost)

#### Execute

When threshold is met, execute the transaction on Horizen using aggregated proofs.

![Execute Flow](.gitbook/assets/zkverify-horizen/execute-flow.png)

- **zkVerify**: Provide aggregation data from job-ids
- **Horizen**: Verify aggregated proofs + execute transaction

### 4. Transaction Types

All transaction types follow the same Propose → Approve → Execute flow:

| Type             | Description                            |
| ---------------- | -------------------------------------- |
| TRANSFER         | Transfer tokens to recipient           |
| BATCH_TRANSFER   | Transfer tokens to multiple recipients |
| ADD_SIGNER       | Add new signer to multisig             |
| REMOVE_SIGNER    | Remove signer from multisig            |
| UPDATE_THRESHOLD | Change approval threshold              |

## Explorer Links

### zkVerify

- **Mainnet**: https://zkverify.subscan.io/
- **Testnet**: https://zkverify-testnet.subscan.io/

### Horizen

- **Mainnet**: https://horizen.calderaexplorer.xyz/
- **Testnet**: https://horizen-testnet.explorer.caldera.xyz/
