import { useEffect, useRef, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { accountApi } from "~~/services/api";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { ErrorCode, handleError, parseError } from "~~/utils/errorHandler";

export const useInitializeApp = () => {
  const router = useAppRouter();
  const { commitment, clearIdentity } = useIdentityStore();
  const { currentWallet, setCurrentWallet, clearCurrentWallet } = useWalletStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Case 1: No commitment (not logged in or logged out)
      if (!commitment) {
        clearCurrentWallet();
        setIsLoading(false);
        setIsInitialized(true);

        // Redirect to new-wallet if on dashboard
        if (router.pathname === Routes.DASHBOARD.path) {
          router.goToDashboardNewWallet();
        }
        return;
      }

      // Case 2: Has commitment, fetch wallets
      try {
        const wallets = await accountApi.getWallets(commitment);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (wallets && wallets.length > 0) {
          // Has wallets
          const isCurrentWalletValid = currentWallet && wallets.some(w => w.address === currentWallet.address);

          if (!isCurrentWalletValid) {
            setCurrentWallet(wallets[0]);
          }

          // Redirect from new-wallet to dashboard
          if (router.pathname === Routes.DASHBOARD.subroutes.NEW_WALLET.path) {
            router.goToDashboard();
          }
        } else {
          // No wallets
          clearCurrentWallet();

          // Redirect to new-wallet if on dashboard
          if (router.pathname === Routes.DASHBOARD.path) {
            router.goToDashboardNewWallet();
          }
        }
      } catch (error: any) {
        // Check if request was aborted
        if (error.name === "AbortError" || abortControllerRef.current?.signal.aborted) {
          return;
        }

        const appError = parseError(error);

        // Handle based on error code
        if (appError.code === ErrorCode.UNAUTHORIZED) {
          // Token expired, logout user
          clearIdentity();
          clearCurrentWallet();
          router.goToDashboard();
        } else if (appError.code === ErrorCode.NOT_FOUND) {
          // Treat as no wallets
          clearCurrentWallet();
          if (router.pathname === Routes.DASHBOARD.path) {
            router.goToDashboardNewWallet();
          }
        } else {
          // Other errors, show notification
          handleError(error, { showNotification: true });
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initialize();

    // Cleanup: abort request on unmount or dependency change
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [commitment]);

  return { isInitialized, isLoading };
};
