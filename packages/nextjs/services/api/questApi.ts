import { apiClient } from "./apiClient";
import { API_ENDPOINTS, LeaderboardEntry, Quest, UserPoints } from "@polypay/shared";

export const questApi = {
  getQuests: async (): Promise<Quest[]> => {
    const { data } = await apiClient.get<Quest[]>(API_ENDPOINTS.quests.base);
    return data;
  },

  getLeaderboard: async (limit?: number): Promise<LeaderboardEntry[]> => {
    const params = limit ? `?limit=${limit}` : "";
    const { data } = await apiClient.get<LeaderboardEntry[]>(`${API_ENDPOINTS.quests.leaderboard}${params}`);
    return data;
  },

  getMyPoints: async (): Promise<UserPoints> => {
    const { data } = await apiClient.get<UserPoints>(API_ENDPOINTS.quests.myPoints);
    return data;
  },
};
