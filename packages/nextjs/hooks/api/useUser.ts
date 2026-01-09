import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { UpdateUserDto } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "~~/services/api";

export const userKeys = {
  all: ["users"] as const,
  me: ["users", "me"] as const,
  meAccounts: ["users", "me", "accounts"] as const,
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
};

export const useMe = () => {
  return useAuthenticatedQuery({
    queryKey: userKeys.me,
    queryFn: () => userApi.getMe(),
  });
};

export const useMyAccounts = () => {
  return useAuthenticatedQuery({
    queryKey: userKeys.meAccounts,
    queryFn: () => userApi.getMyAccounts(),
  });
};

export const useUpdateMe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateUserDto) => userApi.updateMe(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me });
      queryClient.invalidateQueries({ queryKey: userKeys.meAccounts });
    },
  });
};
