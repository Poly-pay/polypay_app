import { useEffect } from "react";
import { socketManager } from "~~/services/socket/socketManager";
import { useIdentityStore, useWalletStore } from "~~/services/store";

/**
 * Hook to manage socket connection based on identity and current wallet
 */
export function useSocketConnection(): void {
  const { currentWallet } = useWalletStore();
  const { commitment } = useIdentityStore();

  useEffect(() => {
    if (!commitment) {
      socketManager.disconnect();
      return;
    }

    socketManager.connect({
      commitment,
      walletAddress: currentWallet?.address,
    });

    return () => {
      socketManager.disconnect();
    };
  }, [commitment, currentWallet?.address]);
}
