import { apiClient } from "./apiClient";
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from "@polypay/shared";
import type {
  LeaderboardEntry,
  LeaderboardFilter,
  LeaderboardMeResponse,
  PaginatedResponse,
  Quest,
  UserPoints,
} from "@polypay/shared";

type LeaderboardParamsExtra = { limit?: number; cursor?: string };

function buildLeaderboardParams(
  filter: LeaderboardFilter,
  week?: number,
  extra?: LeaderboardParamsExtra,
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("filter", filter);
  if (filter === "weekly" && week != null) params.append("week", week.toString());
  if (extra?.limit != null) params.append("limit", extra.limit.toString());
  if (extra?.cursor) params.append("cursor", extra.cursor);
  return params;
}

export const questApi = {
  /**
   * Get all active quests
   */
  getQuests: async (): Promise<Quest[]> => {
    const { data } = await apiClient.get<Quest[]>(API_ENDPOINTS.quests.base);
    return data;
  },

  /**
   * Get top 3 leaderboard entries
   */
  getLeaderboardTop: async (filter: LeaderboardFilter = "all-time", week?: number): Promise<LeaderboardEntry[]> => {
    const params = buildLeaderboardParams(filter, week);
    const { data } = await apiClient.get<LeaderboardEntry[]>(
      `${API_ENDPOINTS.quests.leaderboardTop}?${params.toString()}`,
    );
    return data;
  },

  /**
   * Get current user's leaderboard position
   */
  getLeaderboardMe: async (filter: LeaderboardFilter = "all-time", week?: number): Promise<LeaderboardMeResponse> => {
    const params = buildLeaderboardParams(filter, week);
    const { data } = await apiClient.get<LeaderboardMeResponse>(
      `${API_ENDPOINTS.quests.leaderboardMe}?${params.toString()}`,
    );
    return data;
  },

  /**
   * Get paginated leaderboard
   */
  getLeaderboard: async (
    filter: LeaderboardFilter = "all-time",
    week?: number,
    limit: number = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<PaginatedResponse<LeaderboardEntry>> => {
    const params = buildLeaderboardParams(filter, week, { limit, cursor });
    const { data } = await apiClient.get<PaginatedResponse<LeaderboardEntry>>(
      `${API_ENDPOINTS.quests.leaderboard}?${params.toString()}`,
    );
    return data;
  },

  /**
   * Get current user's points and history
   */
  getMyPoints: async (filter: LeaderboardFilter = "all-time", week?: number): Promise<UserPoints> => {
    const params = buildLeaderboardParams(filter, week);
    const { data } = await apiClient.get<UserPoints>(`${API_ENDPOINTS.quests.myPoints}?${params.toString()}`);
    return data;
  },
};
