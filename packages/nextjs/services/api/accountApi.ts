import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import { Account, CreateAccountDto, UpdateAccountDto } from "@polypay/shared";

export const accountApi = {
  create: async (dto: CreateAccountDto): Promise<Account> => {
    const { data } = await apiClient.post<Account>(API_ENDPOINTS.accounts.base, dto);
    return data;
  },

  getByAddress: async (address: string): Promise<Account> => {
    const { data } = await apiClient.get<Account>(API_ENDPOINTS.accounts.byAddress(address));
    return data;
  },

  update: async (address: string, dto: UpdateAccountDto): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(API_ENDPOINTS.accounts.byAddress(address), dto);
    return data;
  },
};
