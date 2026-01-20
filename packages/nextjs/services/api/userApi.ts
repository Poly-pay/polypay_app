import { apiClient } from "./apiClient";
import { API_ENDPOINTS, Account, CreateUserDto, User } from "@polypay/shared";

export const userApi = {
  create: async (dto: CreateUserDto): Promise<User> => {
    const { data } = await apiClient.post<User>(API_ENDPOINTS.users.base, dto);
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>(API_ENDPOINTS.users.me);
    return data;
  },

  getMyAccounts: async (): Promise<Account[]> => {
    const { data } = await apiClient.get<Account[]>(API_ENDPOINTS.users.meAccounts);
    return data;
  },

  // updateMe: async (dto: UpdateUserDto): Promise<User> => {
  //   const { data } = await apiClient.patch<User>(API_ENDPOINTS.users.me, dto);
  //   return data;
  // },
};
