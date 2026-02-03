import { RatingItem } from "./RatingItem";
import type { LeaderboardEntry, UserPoints } from "@polypay/shared";

interface LeaderBoardTableProps {
  data: LeaderboardEntry[];
  currentUser?: UserPoints | null;
  isLoading?: boolean;
  isClaimed?: boolean;
  onClaim?: () => void;
}

export const LeaderBoardTable = ({
  data,
  currentUser,
  isLoading = false,
  isClaimed = false,
  onClaim,
}: LeaderBoardTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-spin w-8 h-8 border-2 border-main-pink border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
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
        {data.map(item => (
          <RatingItem key={item.userId} rank={item.rank} commitment={item.commitment || ""} points={item.totalPoints} />
        ))}
      </div>
    </div>
  );
};
