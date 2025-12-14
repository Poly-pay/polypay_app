import { BatchItem, CreateBatchItemDto, UpdateBatchItemDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "~~/constants";

// ==================== API Functions ====================

const createBatchItemAPI = async (data: CreateBatchItemDto): Promise<BatchItem> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create batch item");
  }
  return response.json();
};

const getBatchItemsAPI = async (commitment: string): Promise<BatchItem[]> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items?commitment=${commitment}`);
  if (!response.ok) {
    throw new Error("Failed to fetch batch items");
  }
  return response.json();
};

const getBatchItemAPI = async (id: string): Promise<BatchItem> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch batch item");
  }
  return response.json();
};

const updateBatchItemAPI = async (id: string, data: UpdateBatchItemDto): Promise<BatchItem> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update batch item");
  }
  return response.json();
};

const deleteBatchItemAPI = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete batch item");
  }
};

const clearBatchItemsAPI = async (commitment: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/batch-items?commitment=${commitment}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to clear batch items");
  }
};

// ==================== Query Keys ====================

export const batchItemKeys = {
  all: ["batchItems"] as const,
  byCommitment: (commitment: string) => [...batchItemKeys.all, commitment] as const,
  byId: (id: string) => [...batchItemKeys.all, "detail", id] as const,
};

// ==================== Hooks ====================

/**
 * Create a new batch item
 */
export const useCreateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBatchItemAPI,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.byCommitment(variables.commitment),
      });
    },
  });
};

/**
 * Get all batch items for a commitment
 */
export const useBatchItems = (commitment: string | null) => {
  return useQuery({
    queryKey: batchItemKeys.byCommitment(commitment || ""),
    queryFn: () => getBatchItemsAPI(commitment!),
    enabled: !!commitment,
  });
};

/**
 * Get a single batch item by ID
 */
export const useBatchItem = (id: string | null) => {
  return useQuery({
    queryKey: batchItemKeys.byId(id || ""),
    queryFn: () => getBatchItemAPI(id!),
    enabled: !!id,
  });
};

/**
 * Update a batch item
 */
export const useUpdateBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBatchItemDto }) => updateBatchItemAPI(id, data),
    onSuccess: () => {
      // Invalidate all batch items queries
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.all,
      });
    },
  });
};

/**
 * Delete a single batch item
 */
export const useDeleteBatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBatchItemAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.all,
      });
    },
  });
};

/**
 * Clear all batch items for a commitment
 */
export const useClearBatchItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearBatchItemsAPI,
    onSuccess: (_, commitment) => {
      queryClient.invalidateQueries({
        queryKey: batchItemKeys.byCommitment(commitment),
      });
    },
  });
};
