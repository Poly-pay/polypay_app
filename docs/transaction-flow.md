# PolyPay Transaction Flow

## Blockchain Classification

| Action | Blockchain | Description |
|--------|-----------|-------------|
| LOGIN | zkVerify | ZK auth proof verified on zkVerify |
| CREATE_ACCOUNT | Horizen | Multisig contract deployed on Horizen |
| APPROVE | zkVerify | ZK approval proof submitted to zkVerify |
| TRANSFER | zkVerify | ZK proof for transfer vote (initial approval) |
| BATCH_TRANSFER | zkVerify | ZK proof for batch transfer vote (initial approval) |
| ADD_SIGNER | zkVerify | ZK proof for add signer vote (initial approval) |
| REMOVE_SIGNER | zkVerify | ZK proof for remove signer vote (initial approval) |
| UPDATE_THRESHOLD | zkVerify | ZK proof for threshold update vote (initial approval) |
| EXECUTE | Horizen | Final on-chain execution on Horizen (after proof aggregation from zkVerify) |

## Flow Diagram

```mermaid
flowchart TD
    subgraph User["User Actions"]
        A[User connects wallet]
    end

    subgraph Auth["Authentication"]
        B[Generate ZK proof]
        C[Submit proof to zkVerify]
        D[LOGIN recorded]
    end

    subgraph Account["Account Creation"]
        E[Create multisig account]
        F[Deploy contract on Horizen]
        G[CREATE_ACCOUNT recorded]
    end

    subgraph TxCreation["Transaction Creation"]
        H[Create transaction]
        H1[TRANSFER]
        H2[BATCH_TRANSFER]
        H3[ADD_SIGNER]
        H4[REMOVE_SIGNER]
        H5[UPDATE_THRESHOLD]
        I[Submit ZK proof to zkVerify]
        J[Auto-approve by creator]
    end

    subgraph Voting["Approval Phase"]
        K[Other signers review]
        L[Submit ZK approval proof to zkVerify]
        M[APPROVE recorded per signer]
    end

    subgraph Execution["Execution Phase"]
        N[Threshold reached]
        O[Aggregate proofs on zkVerify]
        P[Submit execute tx to Horizen]
        Q[EXECUTE recorded]
    end

    A --> B --> C --> D
    D --> E --> F --> G
    G --> H
    H --> H1 & H2 & H3 & H4 & H5
    H1 & H2 & H3 & H4 & H5 --> I --> J
    J --> K --> L --> M
    M --> N --> O --> P --> Q

    style C fill:#4a9eff,color:#fff
    style D fill:#4a9eff,color:#fff
    style I fill:#4a9eff,color:#fff
    style J fill:#4a9eff,color:#fff
    style L fill:#4a9eff,color:#fff
    style M fill:#4a9eff,color:#fff
    style O fill:#4a9eff,color:#fff
    style F fill:#2ecc71,color:#fff
    style G fill:#2ecc71,color:#fff
    style P fill:#2ecc71,color:#fff
    style Q fill:#2ecc71,color:#fff
```

**Legend:** Blue = zkVerify | Green = Horizen

## Detailed Transaction Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant B as Backend
    participant ZK as zkVerify
    participant H as Horizen

    Note over U,H: 1. LOGIN (zkVerify)
    U->>B: POST /auth/login (ZK proof)
    B->>ZK: Submit auth proof
    ZK-->>B: Proof finalized + txHash
    B-->>U: JWT tokens

    Note over U,H: 2. CREATE_ACCOUNT (Horizen)
    U->>B: POST /accounts (signers, threshold)
    B->>H: Deploy multisig contract
    H-->>B: Contract address + txHash
    B-->>U: Account created

    Note over U,H: 3. TRANSFER / BATCH_TRANSFER (zkVerify)
    U->>B: POST /transactions (type, details, ZK proof)
    B->>ZK: Submit creator's approval proof
    ZK-->>B: Proof finalized + txHash
    B-->>U: Transaction created (PENDING)

    Note over U,H: 4. APPROVE (zkVerify)
    U->>B: POST /transactions/:id/approve (ZK proof)
    B->>ZK: Submit approval proof
    ZK-->>B: Proof finalized + txHash
    B-->>U: Vote recorded

    Note over U,H: 5. EXECUTE (zkVerify + Horizen)
    U->>B: POST /transactions/:id/execute
    B->>ZK: Aggregate all approval proofs
    ZK-->>B: Merkle proofs + aggregation data
    B->>H: Execute transaction with aggregated proofs
    H-->>B: Execution txHash
    B-->>U: Transaction executed
```

## Summary

PolyPay uses a **dual-blockchain architecture**:

- **zkVerify**: Handles all ZK proof verification and aggregation. Every user action (login, approve, create transaction) requires a ZK proof that gets verified on zkVerify. This ensures privacy-preserving authentication and authorization.

- **Horizen**: Handles all on-chain state changes. Contract deployments (CREATE_ACCOUNT) and transaction executions (EXECUTE) happen on Horizen. The execute call includes aggregated proof data from zkVerify as parameters to the smart contract.

### The key insight:
- **Creating/voting** on a transaction = zkVerify (proof verification)
- **Executing** a transaction = Horizen (state change), after aggregating proofs from zkVerify
- A single user action like EXECUTE actually touches **both** blockchains (aggregate on zkVerify, then execute on Horizen)
