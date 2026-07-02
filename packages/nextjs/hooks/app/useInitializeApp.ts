import { useEffect, useRef, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { userApi } from "~~/services/api";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { ErrorCode, handleError, parseError } from "~~/utils/errorHandler";

// Routes that don't require an account (only need login/commitment)
// Quest & Leaderboard temporarily hidden — kept for future reuse.
// const ROUTES_WITHOUT_ACCOUNT = [Routes.QUEST.path, Routes.LEADERBOARD.path];
const ROUTES_WITHOUT_ACCOUNT: string[] = [];

// Arc routes have their own independent auth (nonce-signature login, see
// hooks/app/arc/useArcAuth.ts) and must never be redirected by the ZK gate.
const ARC_ROUTE_PREFIX = "/arc";

// Helper function to check if route requires account
const requiresAccount = (pathname: string) => {
  if (pathname.startsWith(ARC_ROUTE_PREFIX)) {
    return false;
  }
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

  // Live pathname ref: the effect below intentionally excludes pathname from its
  // dependency array (navigating shouldn't re-trigger getMyAccounts()), so any
  // redirect decision made after an await must read the current path via this ref
  // instead of the pathname captured in the effect's closure.
  const pathnameRef = useRef(router.pathname);
  pathnameRef.current = router.pathname;

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
        if (requiresAccount(pathnameRef.current)) {
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
          // Has ZK accounts. Keep an Arc (ECDSA) account selected if the user picked one -
          // Arc accounts are not part of the ZK account list.
          const isCurrentAccountValid =
            currentAccount &&
            (currentAccount.chainType === "ecdsa" || accounts.some(a => a.address === currentAccount.address));

          if (!isCurrentAccountValid) {
            setCurrentAccount(accounts[0]);
          }
          // If have accounts and on new-account page, redirect to dashboard
          if (router.pathname === Routes.DASHBOARD.subroutes.NEW_ACCOUNT.path) {
            router.goToDashboard();
          }
        } else if (currentAccount?.chainType === "ecdsa") {
          // No ZK accounts, but the user is on an Arc (ECDSA) account. The ZK account
          // count excludes Arc accounts, so keep them here instead of forcing new-account.
          if (router.pathname === Routes.DASHBOARD.subroutes.NEW_ACCOUNT.path) {
            router.goToDashboard();
          }
        } else {
          // No accounts
          clearCurrentAccount();

          // Only redirect if on a route that requires account
          if (requiresAccount(pathnameRef.current)) {
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
          if (requiresAccount(pathnameRef.current)) {
            router.goToDashboardNewAccount();
          }
        } else if (appError.code === ErrorCode.NOT_FOUND) {
          // Treat as no accounts
          clearCurrentAccount();

          // Only redirect if on a route that requires account
          if (requiresAccount(pathnameRef.current)) {
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
