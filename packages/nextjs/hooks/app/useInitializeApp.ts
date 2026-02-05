import { useEffect, useRef, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { userApi } from "~~/services/api";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { ErrorCode, handleError, parseError } from "~~/utils/errorHandler";

// Routes that don't require an account (only need login/commitment)
const ROUTES_WITHOUT_ACCOUNT = [Routes.QUEST.path, Routes.LEADERBOARD.path];

// Helper function to check if route requires account
const requiresAccount = (pathname: string) => {
  return !ROUTES_WITHOUT_ACCOUNT.includes(pathname as any);
};

export const useInitializeApp = () => {
  const router = useAppRouter();
  const { logout, accessToken } = useIdentityStore();
  const { currentAccount, setCurrentAccount, clearCurrentAccount } = useAccountStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setMounted] = useState(false);

  // Prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mark mounted after first render to make sure hydration is done
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const initialize = async () => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Case 1: No accessToken - clear state and redirect if needed
      if (!accessToken) {
        clearCurrentAccount();
        setIsLoading(false);
        setIsInitialized(true);

        // Only redirect if on a route that requires account
        if (requiresAccount(router.pathname)) {
          router.goToDashboardNewAccount();
        }
        return;
      }

      // Case 2: Has accessToken, fetch accounts
      try {
        const accounts = await userApi.getMyAccounts();

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (accounts && accounts.length > 0) {
          // Has accounts
          const isCurrentAccountValid = currentAccount && accounts.some(a => a.address === currentAccount.address);

          if (!isCurrentAccountValid) {
            setCurrentAccount(accounts[0]);
          }
          // If have accounts and on new-account page, redirect to dashboard
          if (router.pathname === Routes.DASHBOARD.subroutes.NEW_ACCOUNT.path) {
            router.goToDashboard();
          }
        } else {
          // No accounts
          clearCurrentAccount();

          // Only redirect if on a route that requires account
          if (requiresAccount(router.pathname)) {
            router.goToDashboardNewAccount();
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
          logout();
          clearCurrentAccount();

          // Only redirect if on a route that requires account
          if (requiresAccount(router.pathname)) {
            router.goToDashboardNewAccount();
          }
        } else if (appError.code === ErrorCode.NOT_FOUND) {
          // Treat as no accounts
          clearCurrentAccount();

          // Only redirect if on a route that requires account
          if (requiresAccount(router.pathname)) {
            router.goToDashboardNewAccount();
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
  }, [accessToken, isMounted]);

  return { isInitialized, isLoading };
};
