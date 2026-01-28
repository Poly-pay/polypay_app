import { useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { chain } from "~~/utils/network-config";

export const useEnforceNetwork = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (chainId && chainId !== chain.id) {
      switchChain({ chainId: chain.id });
    }
  }, [chainId, switchChain]);

  return chainId === chain.id;
};
