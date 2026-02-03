import Image from "next/image";
import { LEADER_BOARD_CONFIG, LeaderBoardRank } from "~~/mock-data";
import { getAvatarByCommitment } from "~~/utils/avatar";

interface AvatarRatingProps {
  rank: LeaderBoardRank;
  address: string;
  points: number;
}

export const AvatarRating = ({ rank, address, points }: AvatarRatingProps) => {
  const config = LEADER_BOARD_CONFIG[rank];
  const avatarSrc = getAvatarByCommitment(address);

  // Avatar size = 79% của container (107.12 / 135.37)
  const avatarSize = Math.round(config.size * 0.79);

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Container với border gradient */}
      <div className={`relative ${config.className}`} style={{ width: config.size, height: config.size }}>
        {/* Border/Background image */}
        <Image
          src={config.image}
          width={config.size}
          height={config.size}
          alt="rank border"
          className="absolute inset-0 w-full h-full"
        />
        {/* User avatar ở giữa */}
        <Image
          src={avatarSrc}
          width={avatarSize}
          height={avatarSize}
          alt="avatar"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
          style={{ width: avatarSize, height: avatarSize }}
        />
      </div>
      <span className={config.addressClass}>{address}</span>
      <div className="flex items-center gap-1.5">
        <Image src="/leader-board/star-point.svg" width={config.iconSize} height={config.iconSize} alt="icon" />
        <p className={config.pointsClass}>{points.toLocaleString()}</p>
      </div>
    </div>
  );
};
