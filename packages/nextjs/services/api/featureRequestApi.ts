import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import { CreateFeatureRequestDto, FeatureRequest } from "@polypay/shared";

export const featureRequestApi = {
  create: async (dto: CreateFeatureRequestDto): Promise<FeatureRequest> => {
    const { data } = await apiClient.post<FeatureRequest>(API_ENDPOINTS.featureRequests.base, dto);
    return data;
  },

  getAll: async (): Promise<FeatureRequest[]> => {
    const { data } = await apiClient.get<FeatureRequest[]>(API_ENDPOINTS.featureRequests.base);
    return data;
  },
};
