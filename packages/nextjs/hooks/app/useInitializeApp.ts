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
      if (!commitment || !currentWallet) {
        setIsLoading(false);
        setIsInitialized(true);

        if (pathname === "/dashboard") {
          router.push("/dashboard/new-wallet");
        }
        return;
      }

      try {
        // Fetch wallets from backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/accounts/${commitment}/wallets`);
        const wallets = await response.json();

        if (wallets && wallets.length > 0) {
          // Check if currentWallet is still valid
          const isCurrentWalletValid = currentWallet && wallets.some((w: any) => w.address === currentWallet.address);

          if (!isCurrentWalletValid) {
            // Set first wallet as current
            setCurrentWallet(wallets[0]);
            // Redirect to dashboard only if on new-wallet page
            if (pathname === "/dashboard/new-wallet") {
              router.push("/dashboard");
            }
          }
        } else {
          // No wallets, clear current
          if (currentWallet) {
            clearCurrentWallet();
          }
          // Only redirect if on dashboard route
          if (pathname === "/dashboard") {
            router.push("/dashboard/new-wallet");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitment]);

  return { isInitialized, isLoading };
};
