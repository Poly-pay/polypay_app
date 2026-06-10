import { arbitrum } from "viem/chains";

// Re-export viem's Arbitrum One (42161) chain definition for consistency with
// the other chains module. On Arbitrum the account contract is the Stylus
// (Rust/WASM) port of MetaMultiSigWallet (same as Arbitrum Sepolia).
export { arbitrum as arbitrumOne };
