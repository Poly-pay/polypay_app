# Privacy Architecture

### Traditional vs Privacy Multisig

| Aspect          | Traditional Multisig             | PolyPay                   |
| --------------- | -------------------------------- | ------------------------- |
| Signer Identity | Public addresses stored on-chain | Hidden behind commitments |
| Who Signed      | Visible to everyone              | Only the signer knows     |

### Commitment-Based Identity

Instead of storing addresses, PolyPay stores **commitments** (hash(secret, secret)):

* The **secret** is derived from signing a message with your wallet
* The **commitment** is stored on-chain (in a Merkle tree)
* Only you know the secret that matches your commitment

### How It Works

1. **Setup**: Each signer generates a secret and computes their commitment
2. **Registration**: Commitments are added to the smart contract's Merkle tree
3. **Signing**: To approve a transaction, signers prove they know a secret that matches one of the commitments - without revealing which one

### Anonymity Set

All signers share the same anonymity set. When you sign a transaction:

* The contract knows "one of the N signers approved"
* Nobody knows "which specific signer approved"

This is achieved through ZK proofs and Merkle tree membership proofs.

### Relayer Privacy

In addition to ZK proofs, PolyPay uses a **relayer wallet** to enhance privacy further.

When signers call the smart contract directly, their wallet address is recorded as `msg.sender` on-chain. This partially reveals signer identity.

PolyPay's backend uses a dedicated relayer wallet to deploy wallets and execute transactions on behalf of users. Signers only submit ZK proofs to the backend (off-chain), and the relayer interacts with the blockchain.

| Action              | Without Relayer          | With Relayer         |
| ------------------- | ------------------------ | -------------------- |
| Deploy wallet       | Creator address exposed  | Only relayer visible |
| Execute transaction | Executor address exposed | Only relayer visible |

This creates **complete anonymity**: no signer address ever appears on-chain.
