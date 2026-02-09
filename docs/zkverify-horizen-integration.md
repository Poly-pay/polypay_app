# zkVerify & Horizen Integration

## Overview

PolyPay uses two blockchain layers for privacy-preserving multisig operations:

- **zkVerify**: Verifies zero-knowledge proofs (ultraplonk) off-chain, providing proof verification and aggregation as a service
- **Horizen**: EVM-compatible L3 blockchain where multisig accounts (`MetaMultiSigWallet` contracts) are deployed and transactions are executed

## Blockchain Classification

| Action | Blockchain | Description |
|--------|-----------|-------------|
| LOGIN | zkVerify | ZK auth proof verified on zkVerify |
| CREATE_ACCOUNT | Horizen | `MetaMultiSigWallet` contract deployed on Horizen |
| PROPOSE | zkVerify | Creates a new transaction (TRANSFER, BATCH_TRANSFER, ADD_SIGNER, REMOVE_SIGNER, or UPDATE_THRESHOLD) and submits the creator's ZK approval proof to zkVerify |
| APPROVE | zkVerify | Signer's approval proof submitted to zkVerify |
| DENY | None | Off-chain vote, no proof or on-chain interaction |
| EXECUTE | zkVerify + Horizen | Proofs aggregated on zkVerify, then executed on Horizen |

## Architecture

![Architecture Flow](.gitbook/assets/zkverify-horizen/architecture-flow.png)

## Flows

### 1. Authentication (LOGIN)

User proves ownership of their commitment without revealing the secret.

![Authentication Flow](.gitbook/assets/zkverify-horizen/authentication-flow.png)

- **zkVerify**: Verify ultraplonk proof, return `jobId` and `zkVerifyTxHash`
- **Horizen**: No interaction

### 2. Account Creation (CREATE_ACCOUNT)

Deploy a new multisig account on Horizen.

![Account Creation Flow](.gitbook/assets/zkverify-horizen/account-creation-flow.png)

- **zkVerify**: No interaction
- **Horizen**: Deploy `MetaMultiSigWallet` contract

### 3. Transaction Lifecycle

#### Propose & Approve

When a user proposes a transaction, they automatically approve it. Other signers can then approve.

![Approve Flow](.gitbook/assets/zkverify-horizen/approve-flow.png)

- **zkVerify**: Verify proof, return `jobId`
- **Horizen**: No interaction

#### Deny

Deny is simply a "disagree" vote — no proof required, no on-chain interaction.

![Deny Flow](.gitbook/assets/zkverify-horizen/deny-flow.png)

- **zkVerify**: No interaction (no proof needed)
- **Horizen**: No interaction (no gas cost)

#### Execute

When threshold is met, execute the transaction on Horizen using aggregated proofs.

![Execute Flow](.gitbook/assets/zkverify-horizen/execute-flow.png)

- **zkVerify**: Provide aggregation data (merkle proofs) from job-ids
- **Horizen**: Verify aggregated proofs + execute transaction

### 4. Transaction Types

All transaction types follow the same Propose → Approve → Execute flow:

| Type             | Description                            |
| ---------------- | -------------------------------------- |
| TRANSFER         | Transfer ETH or ERC20 tokens to a recipient |
| BATCH_TRANSFER   | Transfer tokens to multiple recipients in one execution |
| ADD_SIGNER       | Add new signer(s) to the multisig |
| REMOVE_SIGNER    | Remove signer(s) from the multisig |
| UPDATE_THRESHOLD | Change the M-of-N approval threshold |

## Proof Lifecycle

Each ZK proof goes through the following states on zkVerify:

```
PENDING → IncludedInBlock → AggregationPending → Aggregated
                                                      ↓
                                              Ready for execute()
```

| State | Description |
|-------|-------------|
| `PENDING` | Proof submitted, waiting for on-chain inclusion |
| `IncludedInBlock` | Proof verified and finalized on zkVerify |
| `AggregationPending` | Proof is being aggregated with others |
| `Aggregated` | Aggregation complete, merkle proof available for Horizen execution |
| `Failed` | Proof verification failed |

## Explorer Links

### zkVerify

- **Mainnet**: https://zkverify.subscan.io/
- **Testnet**: https://zkverify-testnet.subscan.io/

### Horizen

- **Mainnet**: https://horizen.calderaexplorer.xyz/
- **Testnet**: https://horizen-testnet.explorer.caldera.xyz/
