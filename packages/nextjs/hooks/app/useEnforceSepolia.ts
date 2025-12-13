import { useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export const useEnforceSepolia = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (chainId && chainId !== sepolia.id) {
      switchChain({ chainId: sepolia.id });
    }
  }, [chainId, switchChain]);

  return chainId === sepolia.id;
};
