import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useModalApp } from "./useModalApp";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store";
import { useDisclaimerStore } from "~~/services/store/disclaimerStore";

// Arc routes have their own independent auth flow (see hooks/app/arc/useArcAuth.ts)
// and must never have the ZK "generate commitment" modal forced on them.
const ARC_ROUTE_PREFIX = "/arc";

export const useCommitmentGuard = () => {
  const { data: walletClient } = useWalletClient();
  const { commitment, isAuthenticated } = useIdentityStore();
  const { openModal } = useModalApp();
  const pathname = usePathname();
  const isArcRoute = pathname?.startsWith(ARC_ROUTE_PREFIX) ?? false;

  const hasHydrated = useDisclaimerStore(state => state._hasHydrated);
  const agreedThisSession = useDisclaimerStore(state => state.agreedThisSession);
  const agreedAt = useDisclaimerStore(state => state.agreedAt);
  const dontShowFor30Days = useDisclaimerStore(state => state.dontShowFor30Days);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;

    // Reset the trigger once the guard no longer wants the modal open
    // (commitment created, logged in, wallet disconnected, or on an Arc route
    // which has its own independent auth and must not show the ZK modal).
    const needsCommitment = walletClient?.account && !commitment && !isAuthenticated && !isArcRoute;
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
      if (canProceed && walletClient?.account && !commitment && !isAuthenticated && !isArcRoute) {
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
    isArcRoute,
    openModal,
    agreedThisSession,
    agreedAt,
    dontShowFor30Days,
  ]);
};
