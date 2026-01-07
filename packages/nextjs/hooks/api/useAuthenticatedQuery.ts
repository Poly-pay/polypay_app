import { useIdentityStore } from "~~/services/store";
import {
  useQuery,
  UseQueryOptions,
  QueryKey,
} from "@tanstack/react-query";

/**
 * Wrapper for useQuery that only runs when user is authenticated
 * Prevents 401 spam when user is not logged in
 */
export function useAuthenticatedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const { accessToken } = useIdentityStore();

  return useQuery({
    ...options,
    enabled: !!accessToken && (options.enabled ?? true),
  });
}