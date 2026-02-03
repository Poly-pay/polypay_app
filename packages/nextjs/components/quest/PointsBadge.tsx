import Image from "next/image";

interface PointsBadgeProps {
  points: number;
}

export function PointsBadge({ points }: PointsBadgeProps) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-1 pl-2 bg-pink-150/20 rounded-[70px]">
      <Image 
        src="/quest/point.svg" 
        alt="Points" 
        width={20} 
        height={20} 
      />
      <span className="font-inter-display font-semibold text-sm leading-5 text-grey-1000">
        {points} pts
      </span>
    </div>
  );
}
