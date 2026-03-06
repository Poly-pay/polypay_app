import { QueryClient } from "@tanstack/react-query";
import {
  MUTATION_RETRY_DELAY,
  QUERY_GC_TIME,
  QUERY_RETRY_BASE_DELAY,
  QUERY_RETRY_MAX_DELAY,
  QUERY_STALE_TIME,
} from "~~/constants/timing";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("404")) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(QUERY_RETRY_BASE_DELAY * 2 ** attemptIndex, QUERY_RETRY_MAX_DELAY),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof Error && (error.message.includes("400") || error.message.includes("404"))) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: MUTATION_RETRY_DELAY,
    },
  },
});
