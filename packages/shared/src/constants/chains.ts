// Single source of truth for the EVM chain IDs PolyPay supports.
// Reuse these everywhere instead of redeclaring magic numbers.
export const CHAIN_IDS = {
  HORIZEN_MAINNET: 26514,
  HORIZEN_TESTNET: 2651420,
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
  ARBITRUM_ONE: 42161,
  ARBITRUM_SEPOLIA: 421614,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];
