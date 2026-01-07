import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { UpdateAccountDto } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountApi } from "~~/services/api";

export const accountKeys = {
  all: ["accounts"] as const,
  me: ["accounts", "me"] as const,
  meWallets: ["accounts", "me", "wallets"] as const,
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.me });
    },
  });
};

export const useMe = () => {
  return useAuthenticatedQuery({
    queryKey: accountKeys.me,
    queryFn: () => accountApi.getMe(),
  });
};

export const useMyWallets = () => {
  return useAuthenticatedQuery({
    queryKey: accountKeys.meWallets,
    queryFn: () => accountApi.getMyWallets(),
  });
};

export const useUpdateMe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateAccountDto) => accountApi.updateMe(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.me });
      queryClient.invalidateQueries({ queryKey: accountKeys.meWallets });
    },
  });
};
