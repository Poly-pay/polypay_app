import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIdentityStore, useWalletStore } from "~~/services/store";

export const useInitializeApp = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { commitment } = useIdentityStore();
  const { currentWallet, setCurrentWallet, clearCurrentWallet } = useWalletStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const publicRoutes = ["/mobile"];
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

      if (!commitment && !currentWallet) {
        setIsLoading(false);
        setIsInitialized(true);

        if (pathname && !isPublicRoute && pathname !== "/dashboard/new-wallet") {
          if (pathname === "/dashboard" || pathname === "/") {
            router.push("/dashboard/new-wallet");
          }
        }
        return;
      }

      if (commitment) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/accounts/${commitment}/wallets`);
          const wallets = await response.json();

          if (wallets && wallets.length > 0) {
            const isCurrentWalletValid = currentWallet && wallets.some((w: any) => w.address === currentWallet.address);

            if (!isCurrentWalletValid) {
              setCurrentWallet(wallets[0]);
              if (pathname === "/dashboard/new-wallet") {
                router.push("/dashboard");
              }
            }
          } else {
            if (currentWallet) {
              clearCurrentWallet();
            }
            if (pathname !== "/dashboard/new-wallet") {
              router.push("/dashboard/new-wallet");
            }
          }
        } catch (err) {
          console.error("Failed to initialize app:", err);
        }
      }

      setIsLoading(false);
      setIsInitialized(true);
    };

    initialize();
  }, [clearCurrentWallet, commitment, currentWallet, pathname, router, setCurrentWallet]);

  return { isInitialized, isLoading };
};
