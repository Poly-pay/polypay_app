# Privacy Architecture

### Traditional vs Privacy Multisig

| Aspect          | Traditional Multisig             | PolyPay                   |
| --------------- | -------------------------------- | ------------------------- |
| Signer Identity | Public addresses stored on-chain | Hidden behind commitments |
| Who Signed      | Visible to everyone              | Commitment visible, EOA hidden |

### Commitment-Based Identity

Instead of storing addresses, PolyPay stores **commitments** (hash(secret, secret)):

* The **secret** is derived from signing a message with your wallet
* The **commitment** is stored on-chain in a signers list
* Only you know the secret that matches your commitment

### How It Works

1. **Setup**: Each signer generates a secret and computes their commitment
2. **Registration**: Commitments are added to the smart contract's signers list
3. **Signing**: To approve a transaction, signers prove they know the secret for their commitment using ZK proofs
4. **Verification**: The smart contract checks if the commitment exists in the signers list

### Privacy Model

When you sign a transaction:

* The ZK proof verifies you know the secret for your commitment
* The contract checks your commitment is in the authorized signers list
* Your Ethereum address (EOA) is never revealed on-chain

This means observers can see which commitment signed, but cannot link it back to your wallet address.

### Relayer Privacy

In addition to ZK proofs, PolyPay uses a **relayer wallet** to enhance privacy further.

When signers call the smart contract directly, their wallet address is recorded as `msg.sender` on-chain. This partially reveals signer identity.

PolyPay's backend uses a dedicated relayer wallet to deploy accounts and execute transactions on behalf of users. Signers only submit ZK proofs to the backend (off-chain), and the relayer interacts with the blockchain.

| Action              | Without Relayer          | With Relayer         |
| ------------------- | ------------------------ | -------------------- |
| Deploy account      | Creator address exposed  | Only relayer visible |
| Execute transaction | Executor address exposed | Only relayer visible |

This creates **complete EOA anonymity**: no signer's Ethereum address ever appears on-chain.
