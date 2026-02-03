import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import type { LeaderboardFilter } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { questApi } from "~~/services/api/questApi";

export const questKeys = {
  all: ["quests"] as const,
  list: ["quests", "list"] as const,
  leaderboard: (filter: LeaderboardFilter, week?: number) => ["quests", "leaderboard", filter, week] as const,
  myPoints: (filter: LeaderboardFilter, week?: number) => ["quests", "my-points", filter, week] as const,
};

export const useQuests = () => {
  return useQuery({
    queryKey: questKeys.list,
    queryFn: () => questApi.getQuests(),
  });
};

export const useLeaderboard = (filter: LeaderboardFilter = "all-time", week?: number, limit: number = 25) => {
  return useQuery({
    queryKey: questKeys.leaderboard(filter, week),
    queryFn: () => questApi.getLeaderboard(filter, week, limit),
  });
};

export const useMyPoints = (filter: LeaderboardFilter = "all-time", week?: number) => {
  return useAuthenticatedQuery({
    queryKey: questKeys.myPoints(filter, week),
    queryFn: () => questApi.getMyPoints(filter, week),
  });
};
