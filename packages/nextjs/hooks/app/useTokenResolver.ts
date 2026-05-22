import { useCallback } from "react";
import { useNetworkTokens } from "./useNetworkTokens";
import { getTokenByAddress } from "@polypay/shared";

/**
 * Resolve a token by address for the active (or overridden) chain.
 * Superset of useNetworkTokens that also exposes a memoized getToken resolver.
 */
export function useTokenResolver(overrideChainId?: number) {
  const { tokens, nativeEth, chainId } = useNetworkTokens(overrideChainId);

  const getToken = useCallback((address: string | null | undefined) => getTokenByAddress(address, chainId), [chainId]);

  return { tokens, nativeEth, chainId, getToken };
}
