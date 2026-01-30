import Image from "next/image";
import { LEADER_BOARD_CONFIG, LeaderBoardRank } from "~~/mock-data";

interface AvatarRatingProps {
  rank: LeaderBoardRank;
  address: string;
  points: number;
}

export const AvatarRating = ({ rank, address, points }: AvatarRatingProps) => {
  const config = LEADER_BOARD_CONFIG[rank];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`w-[${config.size}px] h-[${config.size}px] rounded-full ${config.className}`}
        style={{ width: config.size, height: config.size }}
      >
        <Image src={config.image} width={config.size} height={config.size} alt="avatar" />
      </div>
      <span className={config.addressClass}>{address}</span>
      <div className="flex items-center gap-1.5">
        <Image src="/leader-board/star-point.svg" width={config.iconSize} height={config.iconSize} alt="icon" />
        <p className={config.pointsClass}>{points.toLocaleString()}</p>
      </div>
    </div>
  );
};
