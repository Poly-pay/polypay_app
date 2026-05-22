// Arbitrum Stylus deployment helpers for the Rust port of MetaMultiSigWallet.
//
// The Stylus contract exports the SAME Solidity ABI as the EVM contract for its
// runtime methods (execute, getTransactionHash, ...), so the relayer/frontend
// reuse `METAMULTISIG_ABI` for reads/writes. The ONLY differences are at deploy
// time:
//   1. Its constructor takes an extra `poseidonT3` address (Stylus has no linked
//      libraries), so the constructor arg order is:
//        (zkvContract, vkHash, poseidonT3, chainId, commitments, sigsRequired)
//   2. A Stylus contract with a constructor cannot be deployed with a plain
//      CREATE: it must go through the canonical StylusDeployer, which deploys the
//      WASM program, activates it (ArbWasm), and runs the constructor in one tx.

// Chains whose account contract is the Stylus port instead of the EVM .sol one.
export const STYLUS_CHAIN_IDS: readonly number[] = [
  421614, // Arbitrum Sepolia
];

export const isStylusChain = (chainId: number): boolean =>
  STYLUS_CHAIN_IDS.includes(chainId);

// Canonical StylusDeployer address. VERIFY against the current Arbitrum Stylus
// docs for the target chain before relying on it; override via env if needed.
export const STYLUS_DEPLOYER_ADDRESS =
  "0xcEcba2F1DC234f70Dd89F2041029807F8D03A990";

// Minimal StylusDeployer ABI: deploy(bytecode, initData, initValue, salt).
// `initData` is the abi-encoded constructor call (selector + args) that the
// deployer forwards to the freshly deployed program. Returns the new address.
export const STYLUS_DEPLOYER_ABI = [
  {
    type: "function",
    name: "deploy",
    stateMutability: "payable",
    inputs: [
      { name: "bytecode", type: "bytes" },
      { name: "initData", type: "bytes" },
      { name: "initValue", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "ContractDeployed",
    inputs: [{ name: "deployedContract", type: "address", indexed: false }],
  },
] as const;

// Constructor ABI for the Stylus MetaMultiSigWallet, used to encode `initData`.
export const METAMULTISIG_STYLUS_CONSTRUCTOR_ABI = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "zkvContract", type: "address" },
      { name: "vkHash", type: "bytes32" },
      { name: "poseidonT3", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "initialCommitments", type: "uint256[]" },
      { name: "signaturesRequired", type: "uint256" },
    ],
  },
] as const;
