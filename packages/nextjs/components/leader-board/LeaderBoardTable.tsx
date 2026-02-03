"use client";

import { useMemo } from "react";
import { RatingItem } from "./RatingItem";
import type { LeaderboardFilter } from "@polypay/shared";
import { useInfiniteScroll } from "~~/hooks";
import { useLeaderboardInfinite, useLeaderboardMe } from "~~/hooks/api/useQuest";

interface LeaderBoardTableProps {
  filter: LeaderboardFilter;
  week?: number;
  isClaimed?: boolean;
  onClaim?: () => void;
}

export const LeaderBoardTable = ({ filter, week, isClaimed = false, onClaim }: LeaderBoardTableProps) => {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useLeaderboardInfinite(filter, week);

  const { data: currentUser, isLoading: isLoadingMe } = useLeaderboardMe(filter, week);

  const { ref } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // Flatten paginated data
  const leaderboardData = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data?.pages]);

  if (isLoading || isLoadingMe) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-spin w-8 h-8 border-2 border-main-pink border-t-transparent rounded-full" />
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-grey-500">No leaderboard data available</div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 max-h-[500px] overflow-y-auto">
      {/* Sticky Current User */}
      {currentUser && currentUser.rank && (
        <div className="sticky top-0 z-10">
          <RatingItem
            rank={currentUser.rank}
            commitment={currentUser.commitment}
            points={currentUser.totalPoints}
            isCurrentUser
            isClaimed={isClaimed}
            onClaim={onClaim}
          />
          {/* Gradient overlay */}
          <div
            className="absolute left-0 right-0 h-[60px] pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
            }}
          />
        </div>
      )}

      {/* List Items */}
      <div className="flex flex-col gap-2">
        {leaderboardData.map(item => (
          <RatingItem
            key={item.userId}
            rank={item.rank}
            commitment={item.commitment || ""}
            points={item.totalPoints}
            isCurrentUser={currentUser?.commitment === item.commitment}
            isClaimed={currentUser?.commitment === item.commitment ? isClaimed : undefined}
            onClaim={currentUser?.commitment === item.commitment ? onClaim : undefined}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={ref} className="py-4 text-center">
          {isFetchingNextPage && <span className="text-grey-500">Loading more...</span>}
          {!hasNextPage && leaderboardData.length > 0 && <span className="text-grey-500 text-sm">No more entries</span>}
        </div>
      </div>
    </div>
  );
};
