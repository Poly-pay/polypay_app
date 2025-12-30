import { useEffect, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useIdentityStore, useWalletStore } from "~~/services/store";

export const useInitializeApp = () => {
  const router = useAppRouter();
  const { commitment } = useIdentityStore();
  const { currentWallet, setCurrentWallet, clearCurrentWallet } = useWalletStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (!commitment || !currentWallet) {
        setIsLoading(false);
        setIsInitialized(true);

        if (router.pathname === Routes.DASHBOARD.path) {
          router.goToDashboardNewWallet();
        }
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/accounts/${commitment}/wallets`);
        const wallets = await response.json();

        if (wallets && wallets.length > 0) {
          const isCurrentWalletValid = currentWallet && wallets.some((w: any) => w.address === currentWallet.address);

          if (!isCurrentWalletValid) {
            setCurrentWallet(wallets[0]);
            if (router.pathname === Routes.DASHBOARD.subroutes.NEW_WALLET.path) {
              router.goToDashboard();
            }
          }
        } else {
          if (currentWallet) {
            clearCurrentWallet();
          }
          if (router.pathname === Routes.DASHBOARD.path) {
            router.goToDashboardNewWallet();
          }
        }
      } catch (err) {
        console.error("Failed to initialize app:", err);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initialize();
  }, [commitment, currentWallet, router, setCurrentWallet, clearCurrentWallet]);

  return { isInitialized, isLoading };
};
