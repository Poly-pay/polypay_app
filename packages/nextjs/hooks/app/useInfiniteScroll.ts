import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

interface UseInfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Hook for infinite scroll functionality
 * Only triggers fetchNextPage when user has scrolled and trigger element is in view
 */
export const useInfiniteScroll = ({ hasNextPage, isFetchingNextPage, fetchNextPage }: UseInfiniteScrollOptions) => {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px", // Trigger 100px before reaching the end
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { ref, isFetchingNextPage };
};
