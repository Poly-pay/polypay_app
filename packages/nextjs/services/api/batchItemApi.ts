import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { BatchItem, CreateBatchItemDto, UpdateBatchItemDto } from "@polypay/shared";

export const batchItemApi = {
  create: async (dto: CreateBatchItemDto): Promise<BatchItem> => {
    const { data } = await apiClient.post<BatchItem>(API_ENDPOINTS.batchItems.base, dto);
    return data;
  },

  getAll: async (commitment: string): Promise<BatchItem[]> => {
    const { data } = await apiClient.get<BatchItem[]>(API_ENDPOINTS.batchItems.byCommitment(commitment));
    return data;
  },

  getById: async (id: string): Promise<BatchItem> => {
    const { data } = await apiClient.get<BatchItem>(API_ENDPOINTS.batchItems.byId(id));
    return data;
  },

  update: async (id: string, dto: UpdateBatchItemDto): Promise<BatchItem> => {
    const { data } = await apiClient.patch<BatchItem>(API_ENDPOINTS.batchItems.byId(id), dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.batchItems.byId(id));
  },

  clearAll: async (commitment: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.batchItems.clearByCommitment(commitment));
  },
};
