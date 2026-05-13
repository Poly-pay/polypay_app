import { apiClient } from "./apiClient";
import { API_ENDPOINTS, Account, CreateAccountBatchDto, CreateAccountDto, UpdateAccountDto } from "@polypay/shared";

export const accountApi = {
  create: async (dto: CreateAccountDto): Promise<Account> => {
    const { data } = await apiClient.post<Account>(API_ENDPOINTS.accounts.base, dto);
    return data;
  },

  createBatch: async (dto: CreateAccountBatchDto): Promise<Account[]> => {
    const { data } = await apiClient.post<Account[]>(`${API_ENDPOINTS.accounts.base}/batch`, dto);
    return data;
  },

  // Address is no longer globally unique — `chainId` disambiguates which
  // multisig (Horizen vs Base) when the same address exists on both chains.
  getByAddress: async (address: string, chainId: number): Promise<Account> => {
    const { data } = await apiClient.get<Account>(API_ENDPOINTS.accounts.byAddress(address), {
      params: { chainId },
    });
    return data;
  },

  update: async (address: string, chainId: number, dto: UpdateAccountDto): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(API_ENDPOINTS.accounts.byAddress(address), dto, {
      params: { chainId },
    });
    return data;
  },
};
