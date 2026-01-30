import { AvatarRating } from "./AvatarRating";
import { LeaderBoardRank, MOCK_LEADER_BOARD_USERS } from "~~/mock-data";

export const SectionAvatar = () => {
  const sortedUsers = [...MOCK_LEADER_BOARD_USERS].sort((a, b) => {
    const order: Record<LeaderBoardRank, number> = { second: 0, first: 1, third: 2 };
    return order[a.rank] - order[b.rank];
  });

  return (
    <div className="flex items-end gap-16 px-12">
      {sortedUsers.map((user, index) => (
        <AvatarRating key={index} rank={user.rank} address={user.address} points={user.points} />
      ))}
    </div>
  );
};
