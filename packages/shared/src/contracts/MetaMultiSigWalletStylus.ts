// Arbitrum Stylus deployment helpers for the Rust port of MetaMultiSigWallet.
//
// The Stylus contract exports the SAME Solidity ABI as the EVM contract for its
// runtime methods (execute, getTransactionHash, ...), so the relayer/frontend
// reuse `METAMULTISIG_ABI` for reads/writes against deployed wallet addresses.
//
// Deployment is the only thing that differs from the EVM path:
//   - We deploy the Stylus impl ONCE (via `cargo stylus deploy`), then route
//     all per-account creation through `MetaMultiSigWalletStylusFactory`, which
//     clones an EIP-1167 minimal proxy in front of the impl and calls
//     `init(...)` atomically. Each proxy gets its own storage, so signers /
//     nonces / nullifiers stay isolated per wallet. A proxy per account is used
//     because deploying a full Stylus contract (with its activation fee) per
//     account would be far more expensive than a ~52-byte EVM proxy.
//   - The Stylus contract exposes both a `constructor` (used once by
//     cargo-stylus when deploying the impl) and an `init` function with the
//     same args. The latter is what the factory calls on the freshly-cloned
//     proxy through delegatecall.

// Chains whose account contract is the Stylus port instead of the EVM .sol one.
export const STYLUS_CHAIN_IDS: readonly number[] = [
  421614, // Arbitrum Sepolia
  42161, // Arbitrum One
];

export const isStylusChain = (chainId: number): boolean =>
  STYLUS_CHAIN_IDS.includes(chainId);

// Minimal factory ABI: createWallet(...) returns the proxy address and emits
// WalletCreated. `init` is included so callers can build calldata for the
// proxy if they ever need to skip the factory (testing/manual).
export const METAMULTISIG_STYLUS_FACTORY_ABI = [
  {
    type: "function",
    name: "createWallet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "zkvContract", type: "address" },
      { name: "vkHash", type: "bytes32" },
      { name: "poseidonT3", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "initialCommitments", type: "uint256[]" },
      { name: "signaturesRequired", type: "uint256" },
    ],
    outputs: [{ name: "wallet", type: "address" }],
  },
  {
    type: "function",
    name: "implementation",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "WalletCreated",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "commitments", type: "uint256[]", indexed: false },
      { name: "signaturesRequired", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "init",
    stateMutability: "nonpayable",
    inputs: [
      { name: "zkvContract", type: "address" },
      { name: "vkHash", type: "bytes32" },
      { name: "poseidonT3", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "initialCommitments", type: "uint256[]" },
      { name: "signaturesRequired", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
