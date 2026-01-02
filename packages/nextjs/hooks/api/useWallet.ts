import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppRouter } from "../app/useRouteApp";
import { accountKeys } from "./useAccount";
import { UpdateWalletDto, WALLET_CREATED_EVENT, WalletCreatedEventData } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, walletApi } from "~~/services/api";
import { socketManager } from "~~/services/socket/socketManager";
import { useWalletStore } from "~~/services/store";
import { handleError } from "~~/utils/errorHandler";
import { notification } from "~~/utils/scaffold-eth/notification";

export const walletKeys = {
  all: ["wallets"] as const,
  byAddress: (address: string) => [...walletKeys.all, address] as const,
};

export const useCreateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.create,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
      queryClient.setQueryData(walletKeys.byAddress(data.address), data);
      queryClient.invalidateQueries({ queryKey: accountKeys.meWallets });
    },
  });
};

export const useWallet = (address: string) => {
  return useQuery({
    queryKey: walletKeys.byAddress(address),
    queryFn: () => walletApi.getByAddress(address),
    enabled: !!address,
  });
};

export const useUpdateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ address, dto }: { address: string; dto: UpdateWalletDto }) => walletApi.update(address, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: walletKeys.byAddress(variables.address) });
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
};

/**
 * Hook to handle wallet-related realtime events
 * Fetches wallets, selects new wallet, and redirects to dashboard
 */
export function useWalletRealtime(): void {
  const router = useAppRouter();
  const { setCurrentWallet } = useWalletStore();

  useEffect(() => {
    const unsubscribe = socketManager.subscribe<WalletCreatedEventData>(WALLET_CREATED_EVENT, async data => {
      try {
        // Fetch latest wallets
        const wallets = await accountApi.getMyWallets();

        // Find the newly created wallet
        const newWallet = wallets.find(w => w.address === data.walletAddress);

        if (newWallet) {
          // Select the new wallet
          setCurrentWallet(newWallet);

          // Show notification
          notification.success(
            `Wallet "${data.name}" has been created! You are a signer of this ${data.threshold}-of-${data.signerCount} multisig wallet.`,
          );

          // Redirect to dashboard
          router.goToDashboard();
        }
      } catch (error) {
        handleError(error, { showNotification: true });
      }
    });

    return unsubscribe;
  }, [router, setCurrentWallet]);
}
