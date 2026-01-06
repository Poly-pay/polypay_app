import { useEffect, useRef } from "react";
import { useModalApp } from "./useModalApp";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store";

/**
 * Auto open commitment modal when wallet connected but no commitment
 * Place this in root layout
 */
export const useCommitmentGuard = () => {
  const { data: walletClient } = useWalletClient();
  const { commitment, isAuthenticated } = useIdentityStore();
  const { openModal } = useModalApp();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Delay to avoid race condition during logout
    timeoutRef.current = setTimeout(() => {
      // Only open if:
      // 1. Wallet connected
      // 2. No commitment
      // 3. Not in middle of logout (check wallet still exists)
      if (walletClient?.account && !commitment && !isAuthenticated) {
        openModal("generateCommitment");
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [walletClient?.account, commitment, isAuthenticated, openModal]);
};
