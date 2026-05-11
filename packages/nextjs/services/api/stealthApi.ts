import { apiClient } from "./apiClient";
import type {
  RegisterStealthKeysDto,
  RegisterStealthKeysResponse,
  StealthRegistrationStatusResponse,
} from "@polypay/shared";

export const stealthApi = {
  getStatus: async (walletAddress: string): Promise<StealthRegistrationStatusResponse> => {
    const { data } = await apiClient.get<StealthRegistrationStatusResponse>(`/stealth/status/${walletAddress}`);
    return data;
  },

  register: async (dto: RegisterStealthKeysDto): Promise<RegisterStealthKeysResponse> => {
    const { data } = await apiClient.post<RegisterStealthKeysResponse>("/stealth/register", dto);
    return data;
  },
};
