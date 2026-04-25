import { baseMainnet } from "./baseMainnet";
import { baseSepolia } from "./baseSepolia";

/**
 * Map a chainId to the label the x402 facilitator expects in its payment
 * payload and requirements. Throws for unsupported chains so callers never
 * silently send a mainnet payment to a testnet facilitator.
 */
export function chainIdToFacilitatorNetwork(
  chainId: number,
): "base" | "base-sepolia" {
  switch (chainId) {
    case baseMainnet.id:
      return "base";
    case baseSepolia.id:
      return "base-sepolia";
    default:
      throw new Error(
        `Chain ${chainId} is not supported by the x402 facilitator`,
      );
  }
}

export const X402_SUPPORTED_CHAIN_IDS: readonly number[] = [
  baseMainnet.id,
  baseSepolia.id,
];

export function isX402SupportedChain(chainId: number): boolean {
  return X402_SUPPORTED_CHAIN_IDS.includes(chainId);
}
