import { UpdateBatchItemDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchItemApi } from "~~/services/api";

export const batchItemKeys = {
  all: ["batchItems"] as const,
  me: ["batchItems", "me"] as const,
  byId: (id: string) => [...batchItemKeys.all, "detail", id] as const,
};

export const useCreateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchItemKeys.me });
    },
  });
};

export const useMyBatchItems = () => {
  return useQuery({
    queryKey: batchItemKeys.me,
    queryFn: () => batchItemApi.getMyBatchItems(),
  });
};

export const useUpdateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBatchItemDto }) => batchItemApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchItemKeys.all });
    },
  });
};

export const useDeleteBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchItemKeys.all });
    },
  });
};

export const useClearMyBatchItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchItemApi.clearMyBatchItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchItemKeys.me });
    },
  });
};
