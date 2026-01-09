import { useEffect } from "react";
import { socketManager } from "~~/services/socket/socketManager";
import { useAccountStore, useIdentityStore } from "~~/services/store";

/**
 * Hook to manage socket connection based on identity and current wallet
 */
export function useSocketConnection(): void {
  const { currentAccount } = useAccountStore();
  const { commitment } = useIdentityStore();

  useEffect(() => {
    if (!commitment) {
      socketManager.disconnect();
      return;
    }

    socketManager.connect({
      commitment,
      accountAddress: currentAccount?.address,
    });

    return () => {
      socketManager.disconnect();
    };
  }, [commitment, currentAccount?.address]);
}
