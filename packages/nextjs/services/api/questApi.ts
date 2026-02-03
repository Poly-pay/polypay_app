import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import type { LeaderboardEntry, LeaderboardFilter, Quest, UserPoints } from "@polypay/shared";

export const questApi = {
  getQuests: async (): Promise<Quest[]> => {
    const { data } = await apiClient.get<Quest[]>(API_ENDPOINTS.quests.base);
    return data;
  },

  getLeaderboard: async (
    filter: LeaderboardFilter = "all-time",
    week?: number,
    limit: number = 25,
  ): Promise<LeaderboardEntry[]> => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("filter", filter);
    if (filter === "weekly" && week) {
      params.append("week", week.toString());
    }
    const { data } = await apiClient.get<LeaderboardEntry[]>(
      `${API_ENDPOINTS.quests.leaderboard}?${params.toString()}`,
    );
    return data;
  },

  getMyPoints: async (filter: LeaderboardFilter = "all-time", week?: number): Promise<UserPoints> => {
    const params = new URLSearchParams();
    params.append("filter", filter);
    if (filter === "weekly" && week) {
      params.append("week", week.toString());
    }
    const { data } = await apiClient.get<UserPoints>(`${API_ENDPOINTS.quests.myPoints}?${params.toString()}`);
    return data;
  },
};
