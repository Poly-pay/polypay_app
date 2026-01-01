import { UpdateBatchItemDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchItemApi } from "~~/services/api";

export const batchItemKeys = {
  all: ["batchItems"] as const,
  byCommitment: (commitment: string) => [...batchItemKeys.all, commitment] as const,
  byId: (id: string) => [...batchItemKeys.all, "detail", id] as const,
};

export const useCreateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.byCommitment(variables.commitment),
      });
    },
  });
};

export const useBatchItems = (commitment: string | null) => {
  return useQuery({
    queryKey: batchItemKeys.byCommitment(commitment || ""),
    queryFn: () => batchItemApi.getAll(commitment!),
    enabled: !!commitment,
  });
};

export const useBatchItem = (id: string | null) => {
  return useQuery({
    queryKey: batchItemKeys.byId(id || ""),
    queryFn: () => batchItemApi.getById(id!),
    enabled: !!id,
  });
};

export const useUpdateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBatchItemDto }) => batchItemApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.all,
      });
    },
  });
};

export const useDeleteBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.all,
      });
    },
  });
};

export const useClearBatchItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.clearAll,
    onSuccess: (_, commitment) => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.byCommitment(commitment),
      });
    },
  });
};
