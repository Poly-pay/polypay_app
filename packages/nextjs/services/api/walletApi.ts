import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { CreateWalletDto, UpdateWalletDto, Wallet } from "@polypay/shared";

export const walletApi = {
  create: async (dto: CreateWalletDto): Promise<Wallet> => {
    const { data } = await apiClient.post<Wallet>(API_ENDPOINTS.wallets.base, dto);
    return data;
  },

  getByAddress: async (address: string): Promise<Wallet> => {
    const { data } = await apiClient.get<Wallet>(API_ENDPOINTS.wallets.byAddress(address));
    return data;
  },

  update: async (address: string, dto: UpdateWalletDto): Promise<Wallet> => {
    const { data } = await apiClient.patch<Wallet>(API_ENDPOINTS.wallets.byAddress(address), dto);
    return data;
  },
};
