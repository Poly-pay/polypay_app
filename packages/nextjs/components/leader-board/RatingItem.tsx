import Image from "next/image";
import { RankBadge } from "./RankBadge";
import { getAvatarByCommitment } from "~~/utils/avatar";
import { formatAddress } from "~~/utils/format";

interface RatingItemProps {
  rank: number;
  commitment: string;
  points: number;
  isCurrentUser?: boolean;
  isSticky?: boolean;
}

export const RatingItem = ({ rank, commitment, points, isCurrentUser = false, isSticky = false }: RatingItemProps) => {
  const avatarSrc = getAvatarByCommitment(commitment);

  // Shorten commitment for display
  const shortCommitment = commitment ? formatAddress(commitment, { start: 4, end: 4 }) : "Unknown";

  // Determine background color
  // - Sticky current user: pink
  // - Normal users: grey-50
  const getBgClass = () => {
    if (isCurrentUser && isSticky) {
      return "bg-main-pink";
    }
    return "bg-grey-50 hover:bg-grey-100";
  };

  return (
    <div className={`relative rounded-lg h-14 px-3 flex items-center transition-colors ${getBgClass()}`}>
      {/* Pointer for current user (only sticky) */}
      {isCurrentUser && isSticky && (
        <Image
          src="/leader-board/pointer.svg"
          width={24}
          height={24}
          alt="pointer"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-50"
        />
      )}

      {/* Rank - 15% */}
      <div className="w-[15%] flex items-center justify-center">
        {isCurrentUser && isSticky ? (
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <span className="font-barlow font-semibold text-xs text-grey-1000">{rank}</span>
          </div>
        ) : (
          <RankBadge rank={rank} />
        )}
      </div>

      {/* Commitment - 45% */}
      <div className="w-[45%] flex items-center gap-2 px-2">
        <Image src={avatarSrc} width={24} height={24} alt="avatar" className="w-6 h-6 rounded-full flex-shrink-0" />
        <span className="font-barlow font-semibold text-base tracking-[-0.005em] text-grey-1000 truncate">
          {shortCommitment}
        </span>
        {isCurrentUser && (
          <span className="text-sm font-barlow font-semibold bg-lime-50 px-3 py-1 rounded-md text-grey-1000 flex-shrink-0">
            You
          </span>
        )}
      </div>

      {/* Points - flex-1 when no claim button, 25% when has claim button */}
      <div className="flex items-center justify-end gap-1 px-2 flex-1">
        <Image src="/leader-board/star-point.svg" width={24} height={24} alt="points" />
        <span className="font-barlow font-semibold text-base tracking-[-0.005em] text-grey-1000">
          {points.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
