import { useEffect } from "react";
import { socketManager } from "~~/services/socket/socketManager";
import { useWalletStore } from "~~/services/store";

/**
 * Hook to manage socket connection based on current wallet
 * Place this at App or Layout level
 */
export function useSocketConnection(): void {
  const { currentWallet } = useWalletStore();

  useEffect(() => {
    if (currentWallet?.address) {
      socketManager.connect(currentWallet.address);
    } else {
      socketManager.disconnect();
    }

    return () => {
      socketManager.disconnect();
    };
  }, [currentWallet?.address]);
}
