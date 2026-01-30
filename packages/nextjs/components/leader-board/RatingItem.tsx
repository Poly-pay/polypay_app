import { useMemo } from "react";
import Image from "next/image";
import { LeaderBoardCommitmentIcon } from "../icons/LeaderBoardCommitmentIcon";
import { RankBadge } from "./RankBadge";

const COMMITMENT_COLORS = [
  { bg: "#00CC6A", icon: "#00733C" },
  { bg: "#FFE97D", icon: "#B49600" },
  { bg: "#5EA1FF", icon: "#004AB1" },
  { bg: "#FF6EE9", icon: "#C32DAC" },
];

interface RatingItemProps {
  rank: number;
  commitment: string;
  name: string;
  address: string;
  points: number;
  isCurrentUser?: boolean;
}

export const RatingItem = ({ rank, commitment, name, address, points, isCurrentUser = false }: RatingItemProps) => {
  const colorIndex = useMemo(() => rank % COMMITMENT_COLORS.length, [rank]);
  const commitmentColor = COMMITMENT_COLORS[colorIndex];

  return (
    <div
      className={`relative rounded-lg h-14 px-6 flex items-center cursor-pointer transition-colors ${
        isCurrentUser ? "bg-main-pink" : "bg-grey-50 hover:bg-grey-100"
      }`}
    >
      {isCurrentUser && (
        <Image
          src="/leader-board/pointer.svg"
          width={24}
          height={24}
          alt="pointer"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-50"
        />
      )}
      <div className="w-[10%] flex items-center">
        <RankBadge rank={rank} />
      </div>
      <div className="w-[35%] flex items-center gap-2">
        {isCurrentUser && <div className="w-6 h-6 rounded-full bg-white"></div>}
        {!isCurrentUser && (
          <div
            className="rounded-full w-6 h-6 flex items-center justify-center"
            style={{ backgroundColor: commitmentColor.bg }}
          >
            <LeaderBoardCommitmentIcon width={12} height={12} style={{ color: commitmentColor.icon }} />
          </div>
        )}
        <span className="font-semibold">{commitment}</span>
        {isCurrentUser && <span className="text-sm font-semibold bg-lime-50 px-3 py-1 rounded-lg">You</span>}
      </div>
      <div className="w-[30%] flex items-center">
        <span className={`font-semibold ${isCurrentUser ? "text-white" : ""}`}>
          {name} ({address})
        </span>
      </div>
      <div className="w-[25%] flex items-center justify-end gap-1.5">
        <Image src="/leader-board/star-point.svg" width={18} height={18} alt="points" />
        <span className="font-semibold">{points.toLocaleString()}</span>
      </div>
    </div>
  );
};
