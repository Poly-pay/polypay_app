import apiClient from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import { AuthTokens, LoginDto, LoginResponse, RefreshDto } from "@polypay/shared";

export const authApi = {
  login: async (dto: LoginDto): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(API_ENDPOINTS.auth.login, dto);
    return data;
  },

  refresh: async (dto: RefreshDto): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>(API_ENDPOINTS.auth.refresh, dto);
    return data;
  },
};
