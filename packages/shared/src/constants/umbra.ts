import { ZERO_ADDRESS } from "./token";

// Umbra uses this placeholder to represent native ETH in its contract calls
// and Announcement events. Keep separate from ZERO_ADDRESS, which PolyPay's
// own token registry uses for native ETH.
export const UMBRA_ETH_PLACEHOLDER =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const BASE_MAINNET = 8453;

export const UMBRA_ADDRESSES: Record<
  number,
  { umbra: string; registry: string; batchSend: string }
> = {
  [BASE_MAINNET]: {
    umbra: "0xFb2dc580Eed955B528407b4d36FfaFe3da685401",
    registry: "0x31fe56609C65Cd0C510E7125f051D440424D38f3",
    batchSend: "0xDbD0f5EBAdA6632Dde7d47713ea200a7C2ff91EB",
  },
};

// Tokens supported by Umbra's hosted relayer on Base mainnet.
// ZEN is intentionally excluded — relayer does not support it, which would
// force recipients to fund their stealth address with ETH before withdrawing.
export const UMBRA_SUPPORTED_TOKENS: Record<number, readonly string[]> = {
  [BASE_MAINNET]: [
    ZERO_ADDRESS, // native ETH
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  ],
};

export const UMBRA_RELAYER_BASE_URL = "https://mainnet.api.umbra.cash";

export function isStealthSupportedChain(chainId: number): boolean {
  return UMBRA_ADDRESSES[chainId] !== undefined;
}

export function isStealthSupportedToken(
  chainId: number,
  tokenAddress: string,
): boolean {
  const tokens = UMBRA_SUPPORTED_TOKENS[chainId];
  if (!tokens) return false;
  const lower = tokenAddress.toLowerCase();
  return tokens.some((t) => t.toLowerCase() === lower);
}

export function getUmbraAddresses(chainId: number) {
  const addrs = UMBRA_ADDRESSES[chainId];
  if (!addrs) {
    throw new Error(`Umbra not deployed on chain ${chainId}`);
  }
  return addrs;
}
