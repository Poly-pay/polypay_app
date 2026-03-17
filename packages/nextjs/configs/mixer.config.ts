/**
 * Mixer pool options: denominations (in wei/smallest unit) per token type.
 * Must match Mixer.sol allowed denominations.
 */
export const MIXER_DENOMINATIONS = {
  ETH: [
    "10000000000000000", // 0.01
    "100000000000000000", // 0.1
    "1000000000000000000", // 1
  ],
  ZEN: [
    "1000000000000000000", // 1
    "5000000000000000000", // 5
    "10000000000000000000", // 10
    "100000000000000000000", // 100
    "1000000000000000000000", // 1000
  ],
  USDC: [
    "1000000", // 1 (6 decimals)
    "5000000", // 5
    "10000000", // 10
    "100000000", // 100
    "1000000000", // 1000
  ],
} as const;

export const MIXER_SUPPORTED_CHAIN_IDS = [2651420, 84532] as const; // TODO: add mainnet chain or use the same as the shared config
