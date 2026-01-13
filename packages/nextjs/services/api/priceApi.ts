import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";

export interface TokenPrices {
  [coingeckoId: string]: number;
}

export const priceApi = {
  getPrices: async (): Promise<TokenPrices> => {
    const { data } = await apiClient.get<TokenPrices>(API_ENDPOINTS.prices.base);
    return data;
  },
};
