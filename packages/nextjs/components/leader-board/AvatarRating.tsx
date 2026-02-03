import Image from "next/image";
import { getAvatarByCommitment } from "~~/utils/avatar";
import { formatAddress } from "~~/utils/format";

type LeaderBoardRank = "first" | "second" | "third";

interface AvatarRatingProps {
  rank: LeaderBoardRank;
  commitment: string;
  points: number;
}

const RANK_CONFIG: Record<
  LeaderBoardRank,
  {
    size: number;
    image: string;
    className: string;
    addressClass: string;
    iconSize: number;
    pointsClass: string;
  }
> = {
  first: {
    size: 135,
    image: "/leader-board/first-class.png",
    className: "avatar-leader-board-first",
    addressClass: "italic text-grey-1000 text-xl",
    iconSize: 32,
    pointsClass: "text-3xl font-medium text-grey-1000",
  },
  second: {
    size: 120,
    image: "/leader-board/second-class.png",
    className: "avatar-leader-board-second",
    addressClass: "italic text-grey-1000",
    iconSize: 22,
    pointsClass: "text-2xl font-medium text-grey-1000",
  },
  third: {
    size: 120,
    image: "/leader-board/third-class.png",
    className: "avatar-leader-board-third",
    addressClass: "italic text-grey-1000",
    iconSize: 22,
    pointsClass: "text-2xl font-medium text-grey-1000",
  },
};

export const AvatarRating = ({ rank, commitment, points }: AvatarRatingProps) => {
  const config = RANK_CONFIG[rank];
  const avatarSrc = getAvatarByCommitment(commitment);

  // Avatar size = 79% of container (107.12 / 135.37)
  const avatarSize = Math.round(config.size * 0.79);

  // Shorten commitment for display
  const shortCommitment = commitment ? formatAddress(commitment, { start: 4, end: 4 }) : "Unknown";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Container with border image */}
      <div className={`relative ${config.className}`} style={{ width: config.size, height: config.size }}>
        {/* Border/Background image */}
        <Image
          src={config.image}
          width={config.size}
          height={config.size}
          alt="rank border"
          className="absolute inset-0 w-full h-full"
        />
        {/* User avatar centered */}
        <Image
          src={avatarSrc}
          width={avatarSize}
          height={avatarSize}
          alt="avatar"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
          style={{ width: avatarSize, height: avatarSize }}
        />
      </div>

      <span className={config.addressClass}>{shortCommitment}</span>
      <div className="flex items-center gap-1.5">
        <Image src="/leader-board/star-point.svg" width={config.iconSize} height={config.iconSize} alt="icon" />
        <p className={config.pointsClass}>{points.toLocaleString()}</p>
      </div>
    </div>
  );
};
