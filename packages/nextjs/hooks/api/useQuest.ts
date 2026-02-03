import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { DEFAULT_PAGE_SIZE } from "@polypay/shared";
import type { LeaderboardEntry, LeaderboardFilter, PaginatedResponse } from "@polypay/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { questApi } from "~~/services/api/questApi";

export const questKeys = {
  all: ["quests"] as const,
  list: ["quests", "list"] as const,
  leaderboardTop: (filter: LeaderboardFilter, week?: number) => ["quests", "leaderboard", "top", filter, week] as const,
  leaderboardMe: (filter: LeaderboardFilter, week?: number) => ["quests", "leaderboard", "me", filter, week] as const,
  leaderboard: (filter: LeaderboardFilter, week?: number) => ["quests", "leaderboard", filter, week] as const,
  myPoints: (filter: LeaderboardFilter, week?: number) => ["quests", "my-points", filter, week] as const,
};

/**
 * Hook to fetch all quests
 */
export const useQuests = () => {
  return useQuery({
    queryKey: questKeys.list,
    queryFn: () => questApi.getQuests(),
  });
};

/**
 * Hook to fetch top 3 leaderboard entries
 */
export const useLeaderboardTop = (filter: LeaderboardFilter = "all-time", week?: number) => {
  return useQuery({
    queryKey: questKeys.leaderboardTop(filter, week),
    queryFn: () => questApi.getLeaderboardTop(filter, week),
  });
};

/**
 * Hook to fetch current user's leaderboard position
 */
export const useLeaderboardMe = (filter: LeaderboardFilter = "all-time", week?: number) => {
  return useAuthenticatedQuery({
    queryKey: questKeys.leaderboardMe(filter, week),
    queryFn: () => questApi.getLeaderboardMe(filter, week),
  });
};

/**
 * Hook for infinite scroll leaderboard
 */
export const useLeaderboardInfinite = (filter: LeaderboardFilter = "all-time", week?: number) => {
  return useInfiniteQuery({
    queryKey: [...questKeys.leaderboard(filter, week), "infinite"],
    queryFn: ({ pageParam }) => questApi.getLeaderboard(filter, week, DEFAULT_PAGE_SIZE, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<LeaderboardEntry>) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
};

/**
 * Hook to fetch current user's points and history
 */
export const useMyPoints = (filter: LeaderboardFilter = "all-time", week?: number) => {
  return useAuthenticatedQuery({
    queryKey: questKeys.myPoints(filter, week),
    queryFn: () => questApi.getMyPoints(filter, week),
  });
};
