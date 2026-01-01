import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { Account, CreateAccountDto, UpdateAccountDto } from "@polypay/shared";

export interface AccountWallet {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  isCreator: boolean;
}

export const accountApi = {
  create: async (dto: CreateAccountDto): Promise<Account> => {
    const { data } = await apiClient.post<Account>(API_ENDPOINTS.accounts.base, dto);
    return data;
  },

  getByCommitment: async (commitment: string): Promise<Account> => {
    const { data } = await apiClient.get<Account>(API_ENDPOINTS.accounts.byCommitment(commitment));
    return data;
  },

  getWallets: async (commitment: string): Promise<AccountWallet[]> => {
    const { data } = await apiClient.get<AccountWallet[]>(API_ENDPOINTS.accounts.wallets(commitment));
    return data;
  },

  update: async (commitment: string, dto: UpdateAccountDto): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(API_ENDPOINTS.accounts.byCommitment(commitment), dto);
    return data;
  },
};
