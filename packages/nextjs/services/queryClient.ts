import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("404")) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof Error && (error.message.includes("400") || error.message.includes("404"))) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});
