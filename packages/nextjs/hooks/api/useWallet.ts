import { accountKeys } from "./useAccount";
import { UpdateWalletDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "~~/services/api";

export const walletKeys = {
  all: ["wallets"] as const,
  byAddress: (address: string) => [...walletKeys.all, address] as const,
};

export const useCreateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.create,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
      queryClient.setQueryData(walletKeys.byAddress(data.address), data);

      variables.commitments.forEach(commitment => {
        queryClient.invalidateQueries({ queryKey: accountKeys.wallets(commitment) });
      });
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

export const useWallets = () => {
  return useQuery({
    queryKey: walletKeys.all,
    queryFn: walletApi.getAll,
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
