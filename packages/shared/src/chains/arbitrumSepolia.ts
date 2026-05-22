import { arbitrumSepolia } from "viem/chains";

// Re-export viem's Arbitrum Sepolia chain definition for consistency with other chains module.
// Arbitrum is testnet-only in PolyPay: zkVerify has a verifier on Arbitrum Sepolia (421614)
// but not on Arbitrum One mainnet yet.
export { arbitrumSepolia };
