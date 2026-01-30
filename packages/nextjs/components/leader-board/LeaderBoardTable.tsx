import { RatingItem } from "./RatingItem";
import { LeaderBoardTableItem, MOCK_CURRENT_USER, MOCK_LEADER_BOARD_TABLE } from "~~/mock-data";

interface LeaderBoardTableProps {
  data?: LeaderBoardTableItem[];
  currentUser?: LeaderBoardTableItem;
}

export const LeaderBoardTable = ({
  data = MOCK_LEADER_BOARD_TABLE,
  currentUser = MOCK_CURRENT_USER,
}: LeaderBoardTableProps) => {
  return (
    <div className="flex flex-col gap-2">
      {currentUser && (
        <RatingItem
          rank={currentUser.rank}
          commitment={currentUser.commitment}
          name={currentUser.name}
          address={currentUser.address}
          points={currentUser.points}
          isCurrentUser
        />
      )}
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
  );
};
