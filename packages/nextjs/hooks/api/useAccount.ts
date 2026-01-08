import { useEffect } from "react";
import { useAppRouter } from "../app/useRouteApp";
import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { userKeys } from "./useUser";
import { ACCOUNT_CREATED_EVENT, AccountCreatedEventData, UpdateAccountDto } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountApi, userApi } from "~~/services/api";
import { socketManager } from "~~/services/socket/socketManager";
import { useAccountStore } from "~~/services/store";
import { handleError } from "~~/utils/errorHandler";
import { notification } from "~~/utils/scaffold-eth/notification";

export const accountKeys = {
  all: ["accounts"] as const,
  byAddress: (address: string) => [...accountKeys.all, address] as const,
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountApi.create,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.setQueryData(accountKeys.byAddress(data.address), data);
      queryClient.invalidateQueries({ queryKey: userKeys.meAccounts });
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
};

export const useAccount = (address: string) => {
  return useAuthenticatedQuery({
    queryKey: accountKeys.byAddress(address),
    queryFn: () => accountApi.getByAddress(address),
    enabled: !!address,
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ address, dto }: { address: string; dto: UpdateAccountDto }) => accountApi.update(address, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.byAddress(variables.address) });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
};

/**
 * Hook to handle account-related realtime events
 * Fetches accounts, selects new account, and redirects to dashboard
 */
export function useAccountRealtime(): void {
  const router = useAppRouter();
  const { setCurrentAccount } = useAccountStore();

  useEffect(() => {
    const unsubscribe = socketManager.subscribe<AccountCreatedEventData>(ACCOUNT_CREATED_EVENT, async data => {
      try {
        // Fetch latest accounts
        const accounts = await userApi.getMyAccounts();

        // Find the newly created account
        const newAccount = accounts.find(a => a.address === data.accountAddress);

        if (newAccount) {
          // Select the new account
          setCurrentAccount(newAccount);

          // Show notification
          notification.success(
            `Account "${data.name}" has been created! You are a signer of this ${data.threshold}-of-${data.signerCount} multisig account.`,
          );

          // Redirect to dashboard
          router.goToDashboard();
        }
      } catch (error) {
        handleError(error, { showNotification: true });
      }
    });

    return unsubscribe;
  }, [router, setCurrentAccount]);
}
