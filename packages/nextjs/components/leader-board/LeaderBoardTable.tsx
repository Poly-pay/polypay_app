import { RatingItem } from "./RatingItem";
import { LeaderBoardTableItem, MOCK_CURRENT_USER, MOCK_LEADER_BOARD_TABLE } from "~~/mock-data";

interface LeaderBoardTableProps {
  data?: LeaderBoardTableItem[];
  currentUser?: LeaderBoardTableItem;
  isClaimed?: boolean;
  onClaim?: () => void;
}

export const LeaderBoardTable = ({
  data = MOCK_LEADER_BOARD_TABLE,
  currentUser = MOCK_CURRENT_USER,
  isClaimed = false,
  onClaim,
}: LeaderBoardTableProps) => {
  return (
    <div className="relative flex flex-col gap-2 max-h-[500px] overflow-y-auto">
      {/* Sticky Current User */}
      {currentUser && (
        <div className="sticky top-0 z-10">
          <RatingItem
            rank={currentUser.rank}
            commitment={currentUser.commitment}
            name={currentUser.name}
            address={currentUser.address}
            points={currentUser.points}
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
          <RatingItem
            key={item.rank}
            rank={item.rank}
            commitment={item.commitment}
            name={item.name}
            address={item.address}
            points={item.points}
          />
        ))}
      </div>
    </div>
  );
};
