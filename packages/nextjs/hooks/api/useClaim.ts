import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimApi } from "~~/services/api/claimApi";
import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import type { ClaimRequest } from "@polypay/shared";

export const claimKeys = {
  summary: ["claims", "summary"] as const,
};

/**
 * Hook to fetch claim summary
 */
export const useClaimSummary = () => {
  return useAuthenticatedQuery({
    queryKey: claimKeys.summary,
    queryFn: () => claimApi.getSummary(),
  });
};

/**
 * Hook to claim rewards
 */
export const useClaimRewards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ClaimRequest) => claimApi.claim(request),
    onSuccess: () => {
      // Invalidate claim summary to refresh data
      queryClient.invalidateQueries({ queryKey: claimKeys.summary });
    },
  });
};
