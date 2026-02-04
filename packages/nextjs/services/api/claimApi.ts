import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import type { ClaimRequest, ClaimResponse, ClaimSummary } from "@polypay/shared";

export const claimApi = {
  /**
   * Get claim summary for current user
   */
  getSummary: async (): Promise<ClaimSummary> => {
    const { data } = await apiClient.get<ClaimSummary>(API_ENDPOINTS.claims.summary);
    return data;
  },

  /**
   * Claim all unclaimed rewards
   */
  claim: async (request: ClaimRequest): Promise<ClaimResponse> => {
    const { data } = await apiClient.post<ClaimResponse>(API_ENDPOINTS.claims.base, request);
    return data;
  },
};
