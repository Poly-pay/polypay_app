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
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;

    // Reset the trigger once the guard no longer wants the modal open
    // (commitment created, logged in, or wallet disconnected).
    const needsCommitment = walletClient?.account && !commitment && !isAuthenticated;
    if (!needsCommitment) {
      hasOpenedRef.current = false;
      return;
    }

    if (hasOpenedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const canProceed = useDisclaimerStore.getState().canProceed();
      if (canProceed && walletClient?.account && !commitment && !isAuthenticated) {
        hasOpenedRef.current = true;
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
