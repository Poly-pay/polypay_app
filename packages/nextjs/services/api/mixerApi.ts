import { apiClient } from "./apiClient";
import {
  API_ENDPOINTS,
  MixerDepositsParams,
  MixerDepositsResponse,
  MixerWithdrawParams,
} from "@polypay/shared";

export const mixerApi = {
  getDeposits: async (params: MixerDepositsParams): Promise<MixerDepositsResponse> => {
    const search = new URLSearchParams();
    search.set("chainId", String(params.chainId));
    search.set("token", params.token);
    search.set("denomination", params.denomination);
    if (params.fromLeaf !== undefined) search.set("fromLeaf", String(params.fromLeaf));
    if (params.toLeaf !== undefined) search.set("toLeaf", String(params.toLeaf));
    const { data } = await apiClient.get<MixerDepositsResponse>(
      `${API_ENDPOINTS.mixer.deposits}?${search.toString()}`,
    );
    return data;
  },

  getDepositCount: async (
    chainId: number,
    token: string,
    denomination: string,
  ): Promise<number> => {
    const search = new URLSearchParams({
      chainId: String(chainId),
      token,
      denomination,
    });
    const { data } = await apiClient.get<number>(
      `${API_ENDPOINTS.mixer.depositCount}?${search.toString()}`,
    );
    return data;
  },

  withdraw: async (params: MixerWithdrawParams): Promise<{ txHash: string; status: string }> => {
    const { data } = await apiClient.post<{ txHash: string; status: string }>(
      API_ENDPOINTS.mixer.withdraw,
      params,
    );
    return data;
  },

  // TODO: remove this endpoint
  registerVk: async (vk: string): Promise<{ vkHash: string }> => {
    const { data } = await apiClient.post<{ vkHash: string }>(
      API_ENDPOINTS.mixer.registerVk,
      { vk },
    );
    return data;
  },
};
