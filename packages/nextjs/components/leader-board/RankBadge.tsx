import Image from "next/image";

interface RankBadgeProps {
  rank: number;
}

export const RankBadge = ({ rank }: RankBadgeProps) => {
  if (rank <= 3) {
    return <Image src={`/leader-board/rating-${rank}.png`} width={32} height={32} alt={`rank ${rank}`} />;
  }

  return (
    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white">
      <span className="text-sm font-semibold">{rank}</span>
    </div>
  );
};
