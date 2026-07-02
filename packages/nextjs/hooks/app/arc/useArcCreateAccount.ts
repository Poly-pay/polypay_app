import { useMutation, useQueryClient } from "@tanstack/react-query";
import { arcApi } from "~~/services/api";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

// Query key for the Arc accounts list, kept here since no Arc accounts-list
// hook exists yet. Future hooks that fetch Arc accounts should reuse this key.
export const arcAccountKeys = {
  all: ["arcAccounts"] as const,
};

export const useArcCreateAccount = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: arcApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arcAccountKeys.all });
      notification.success("Arc multisig account created!");
    },
    onError: err => {
      notification.error(formatErrorMessage(err, "Failed to create Arc multisig account"));
    },
  });

  const createAccount = (owners: string[], threshold: number, chainId: number, name?: string) =>
    mutation.mutateAsync({ owners, threshold, chainId, name });

  return {
    createAccount,
    isPending: mutation.isPending,
  };
};
