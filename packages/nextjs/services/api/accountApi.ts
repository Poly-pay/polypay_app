import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { Account, CreateAccountDto, UpdateAccountDto, Wallet } from "@polypay/shared";

export const accountApi = {
  create: async (dto: CreateAccountDto): Promise<Account> => {
    const { data } = await apiClient.post<Account>(API_ENDPOINTS.accounts.base, dto);
    return data;
  },

  getMe: async (): Promise<Account> => {
    const { data } = await apiClient.get<Account>(API_ENDPOINTS.accounts.me);
    return data;
  },

  getMyWallets: async (): Promise<Wallet[]> => {
    const { data } = await apiClient.get<Wallet[]>(API_ENDPOINTS.accounts.meWallets);
    return data;
  },

  updateMe: async (dto: UpdateAccountDto): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(API_ENDPOINTS.accounts.me, dto);
    return data;
  },
};
