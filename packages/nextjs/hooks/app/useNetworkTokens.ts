import { useMemo } from "react";
import { getNativeEth, getSupportedTokens } from "@polypay/shared";
import { useAccountStore } from "~~/services/store";
import { getDefaultChainId } from "~~/utils/network";

export function useNetworkTokens(overrideChainId?: number) {
  const { currentAccount } = useAccountStore();
  const chainId = overrideChainId ?? (currentAccount as any)?.chainId ?? getDefaultChainId();

  const tokens = useMemo(() => getSupportedTokens(chainId), [chainId]);
  const nativeEth = useMemo(() => getNativeEth(chainId), [chainId]);

  return {
    tokens,
    nativeEth,
    chainId,
  };
}
