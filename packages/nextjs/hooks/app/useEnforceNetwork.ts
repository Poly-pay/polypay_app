import { useEffect } from "react";
import { horizenTestnet } from "@polypay/shared";
import { useChainId, useSwitchChain } from "wagmi";

export const useEnforceNetwork = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (chainId && chainId !== horizenTestnet.id) {
      switchChain({ chainId: horizenTestnet.id });
    }
  }, [chainId, switchChain]);

  return chainId === horizenTestnet.id;
};
