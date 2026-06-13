import { baseMainnet } from "./baseMainnet";
import { baseSepolia } from "./baseSepolia";
import { arbitrumOne } from "./arbitrumOne";
import { arbitrumSepolia } from "./arbitrumSepolia";

/**
 * Map a chainId to the label the x402 facilitator expects in its payment
 * payload and requirements. Throws for unsupported chains so callers never
 * silently send a mainnet payment to a testnet facilitator.
 *
 * These labels are the x402 v1 `network` field sent to PayAI's facilitator
 * (PayAI's /supported lists "base", "base-sepolia", "arbitrum", and
 * "arbitrum-sepolia" for the v1 "exact" scheme). They also satisfy the internal
 * frontend<->backend equality check
 * (`payload.network === chainIdToFacilitatorNetwork(chainId)`).
 */
export function chainIdToFacilitatorNetwork(
  chainId: number,
): "base" | "base-sepolia" | "arbitrum" | "arbitrum-sepolia" {
  switch (chainId) {
    case baseMainnet.id:
      return "base";
    case baseSepolia.id:
      return "base-sepolia";
    case arbitrumOne.id:
      return "arbitrum";
    case arbitrumSepolia.id:
      return "arbitrum-sepolia";
    default:
      throw new Error(
        `Chain ${chainId} is not supported by the x402 facilitator`,
      );
  }
}

export const X402_SUPPORTED_CHAIN_IDS: readonly number[] = [
  baseMainnet.id,
  baseSepolia.id,
  arbitrumOne.id,
  arbitrumSepolia.id,
];

export function isX402SupportedChain(chainId: number): boolean {
  return X402_SUPPORTED_CHAIN_IDS.includes(chainId);
}
