"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useAccountStore } from "~~/services/store";

export const useNetworkGuard = () => {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { currentAccount } = useAccountStore();

  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    const ensureNetwork = async () => {
      if (!currentAccount?.chainId || !chain?.id) {
        setIsWrongNetwork(false);
        return;
      }

      if (chain.id === currentAccount.chainId) {
        setIsWrongNetwork(false);
        return;
      }

      try {
        await switchChainAsync({ chainId: currentAccount.chainId });
        setIsWrongNetwork(false);
      } catch {
        setIsWrongNetwork(true);
      }
    };

    void ensureNetwork();
  }, [chain?.id, currentAccount?.chainId, switchChainAsync]);

  return {
    isWrongNetwork,
    targetChainId: currentAccount?.chainId,
  };
};
