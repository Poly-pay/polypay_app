import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { BatchItem, CreateBatchItemDto, UpdateBatchItemDto } from "@polypay/shared";

export const batchItemApi = {
  create: async (dto: CreateBatchItemDto): Promise<BatchItem> => {
    const { data } = await apiClient.post<BatchItem>(API_ENDPOINTS.batchItems.base, dto);
    return data;
  },

  getMyBatchItems: async (): Promise<BatchItem[]> => {
    const { data } = await apiClient.get<BatchItem[]>(API_ENDPOINTS.batchItems.me);
    return data;
  },

  update: async (id: string, dto: UpdateBatchItemDto): Promise<BatchItem> => {
    const { data } = await apiClient.patch<BatchItem>(API_ENDPOINTS.batchItems.byId(id), dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.batchItems.byId(id));
  },

  clearMyBatchItems: async (): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.batchItems.me);
  },
};
