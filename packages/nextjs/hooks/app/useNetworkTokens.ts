import { useMemo } from "react";
import { NetworkType, NetworkValue, getNativeEth, getSupportedTokens } from "@polypay/shared";

function getNetwork(): NetworkType {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  return network === NetworkValue.testnet ? "testnet" : "mainnet";
}

export function useNetworkTokens() {
  const network = getNetwork();

  const tokens = useMemo(() => getSupportedTokens(network), [network]);
  const nativeEth = useMemo(() => getNativeEth(network), [network]);

  return {
    tokens,
    nativeEth,
    network,
  };
}

// Export singleton for non-hook usage
export const NETWORK = getNetwork();
export const NETWORK_TOKENS = getSupportedTokens(NETWORK);
export const NETWORK_NATIVE_ETH = getNativeEth(NETWORK);
