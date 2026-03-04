# Cross-Chain Transfers

PolyPay supports bridging tokens between **Horizen** and **Base** networks directly from the multisig wallet. Cross-chain transfers go through the same privacy-preserving approval flow as regular transfers -- signers approve with ZK proofs, and the relayer executes on-chain.

### Supported Routes

| Token | Base → Horizen | Horizen → Base | Bridge |
|-------|:-:|:-:|--------|
| ETH | Yes | No | OP Stack native bridge |
| ZEN | Yes | Yes | LayerZero OFT |
| USDC | Yes (mainnet) | Yes (mainnet) | Stargate V2 (LayerZero) |

ETH can only be bridged from Base to Horizen using the OP Stack native bridge. The reverse direction is not supported because Horizen is an optimistic rollup and ETH withdrawals require a challenge period that does not fit the instant transfer model.

ZEN and USDC use [LayerZero](https://layerzero.network) for bidirectional transfers between both chains.

### How It Works

1. **Select destination chain** -- When creating a transfer, choose the target network from the chain selector. If only same-chain is available for that token, the selector is hidden.
2. **Approve** -- Other signers review and approve the cross-chain transfer exactly like a regular transfer. The destination chain is displayed in the transaction details.
3. **Execute** -- Once the approval threshold is met, any signer can trigger execution. The relayer submits the transaction on-chain, which calls the bridge contract to deliver tokens to the recipient on the destination chain.

### Contract Version Requirement

Cross-chain transfers require **MetaMultiSigWallet contract version 2** or higher. Version 2 introduces the `approveAndCall` function, which atomically approves a token and calls a bridge contract in a single multisig transaction. Accounts on version 1 will not see the chain selector in the UI.

### Fees

Cross-chain transfers involve two types of fees:

| Fee | Paid in | Applies to | Description |
|-----|---------|------------|-------------|
| LayerZero messaging fee | ETH | ZEN, USDC | Covers cross-chain message delivery. Paid from the wallet's ETH balance. |
| Stargate protocol fee | USDC (deducted from amount) | USDC only | ~0.06% fee charged by Stargate V2. The recipient receives slightly less than the sent amount. |

ETH bridging via OP Stack does not have an explicit bridge fee beyond the normal transaction gas on Base.

### Limitations

* Batch transfers do not support cross-chain. Each cross-chain transfer must be submitted individually.
* USDC bridging is only available on mainnet (no testnet OFT contracts deployed).
* ETH cannot be bridged from Horizen to Base.

For technical details on the bridge implementation, see [Cross-Chain Bridge Implementation](developer-documentation/cross-chain-bridge-implementation.md).
