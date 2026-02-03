import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { useQuery } from "@tanstack/react-query";
import { questApi } from "~~/services/api/questApi";

export const questKeys = {
  all: ["quests"] as const,
  list: ["quests", "list"] as const,
  leaderboard: (limit?: number) => ["quests", "leaderboard", limit] as const,
  myPoints: ["quests", "my-points"] as const,
};

export const useQuests = () => {
  return useQuery({
    queryKey: questKeys.list,
    queryFn: () => questApi.getQuests(),
  });
};

export const useLeaderboard = (limit?: number) => {
  return useQuery({
    queryKey: questKeys.leaderboard(limit),
    queryFn: () => questApi.getLeaderboard(limit),
  });
};

export const useMyPoints = () => {
  return useAuthenticatedQuery({
    queryKey: questKeys.myPoints,
    queryFn: () => questApi.getMyPoints(),
  });
};
