import { useEffect, useRef } from "react";
import { useModalApp } from "./useModalApp";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store";
import { useDisclaimerStore } from "~~/services/store/disclaimerStore";

export const useCommitmentGuard = () => {
  const { data: walletClient } = useWalletClient();
  const { commitment, isAuthenticated } = useIdentityStore();
  const { openModal } = useModalApp();

  const hasHydrated = useDisclaimerStore(state => state._hasHydrated);
  const agreedThisSession = useDisclaimerStore(state => state.agreedThisSession);
  const agreedAt = useDisclaimerStore(state => state.agreedAt);
  const dontShowFor30Days = useDisclaimerStore(state => state.dontShowFor30Days);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const canProceed = useDisclaimerStore.getState().canProceed();

      // Only open if:
      // 1. Wallet connected
      // 2. No commitment
      // 3. Not in middle of logout (check wallet still exists)
      // 4. Disclaimer agreed
      if (canProceed && walletClient?.account && !commitment && !isAuthenticated) {
        openModal("generateCommitment");
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    hasHydrated,
    walletClient?.account,
    commitment,
    isAuthenticated,
    openModal,
    agreedThisSession,
    agreedAt,
    dontShowFor30Days,
  ]);
};
