import { UpdateAccountDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AccountWallet, accountApi } from "~~/services/api";

export type { AccountWallet };

export const accountKeys = {
  all: ["accounts"] as const,
  byCommitment: (commitment: string) => [...accountKeys.all, commitment] as const,
  wallets: (commitment: string) => [...accountKeys.all, commitment, "wallets"] as const,
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountApi.create,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.setQueryData(accountKeys.byCommitment(data.commitment), data);
    },
  });
};

export const useAccount = (commitment: string) => {
  return useQuery({
    queryKey: accountKeys.byCommitment(commitment),
    queryFn: () => accountApi.getByCommitment(commitment),
    enabled: !!commitment,
  });
};

export const useAccountWallets = (commitment: string) => {
  return useQuery({
    queryKey: accountKeys.wallets(commitment),
    queryFn: () => accountApi.getWallets(commitment),
    enabled: !!commitment,
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commitment, dto }: { commitment: string; dto: UpdateAccountDto }) =>
      accountApi.update(commitment, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.byCommitment(variables.commitment) });
      queryClient.invalidateQueries({ queryKey: accountKeys.wallets(variables.commitment) });
    },
  });
};
