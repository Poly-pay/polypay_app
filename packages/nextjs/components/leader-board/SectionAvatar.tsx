"use client";

import { AvatarRating } from "./AvatarRating";
import type { LeaderboardEntry, LeaderboardFilter } from "@polypay/shared";
import { useLeaderboardTop } from "~~/hooks/api/useQuest";

interface SectionAvatarProps {
  filter: LeaderboardFilter;
  week?: number;
}

type LeaderBoardRank = "first" | "second" | "third";

export const SectionAvatar = ({ filter, week }: SectionAvatarProps) => {
  const { data, isLoading } = useLeaderboardTop(filter, week);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin w-8 h-8 border-2 border-main-pink border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || data.length < 3) {
    return <div className="flex items-center justify-center h-[200px] text-grey-500">Not enough data for top 3</div>;
  }

  // Map top 3 to display order: second | first | third
  const top3: { rank: LeaderBoardRank; data: LeaderboardEntry }[] = [
    { rank: "second", data: data[1] },
    { rank: "first", data: data[0] },
    { rank: "third", data: data[2] },
  ];

  return (
    <div className="flex items-end justify-center gap-16 px-12">
      {top3.map(item => (
        <AvatarRating
          key={item.data.userId}
          rank={item.rank}
          commitment={item.data.commitment || ""}
          points={item.data.totalPoints}
        />
      ))}
    </div>
  );
};
