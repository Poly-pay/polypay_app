# ZK Authentication

### Traditional vs ZK Authentication

| Aspect | Traditional Auth | PolyPay |
| ------ | ---------------- | ------- |
| Login method | Password or wallet signature | ZK proof of secret knowledge |
| Server knows | Password hash or public address | Only commitment (hash of secret) |
| Each login | Send password/sign message | Generate fresh ZK proof |

### Identity Generation

Your identity is based on a **secret** derived from your wallet:

1. Sign a specific message with your wallet (one-time setup)
2. Derive a **secret** from the signature
3. Compute **commitment** = `poseidon_hash(secret, secret)`
4. Store commitment on-chain as your identifier

### Login Flow

| Step | Action |
| ---- | ------ |
| 1 | User generate secret |
| 2 | Client generates ZK proof: "I know a secret that hashes to this commitment" |
| 3 | Proof submitted to zkVerify network |
| 4 | Backend verifies attestation from zkVerify |
| 5 | Backend issues JWT tokens (access + refresh) |

### Why ZK?

- **Secret never leaves your device** - only the proof is sent
- **Server cannot impersonate you** - knowing commitment is not enough
- **No password database to leak** - server stores nothing sensitive
- **Stateless verification** - proof is self-contained
