import Image from "next/image";
import { PointsBadge } from "./PointsBadge";

interface QuestCardProps {
  name: string;
  description: string;
  points: number;
  onClick?: () => void;
}

export function QuestCard({ name, description, points, onClick }: QuestCardProps) {
  return (
    <div
      className="w-[464px] h-[165px] p-[24px_16px] bg-white border border-grey-100 rounded-2xl flex flex-col justify-center gap-6 cursor-pointer hover:bg-grey-50 transition-colors"
      onClick={onClick}
    >
      {/* Top row: Icon + Points */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon placeholder */}
        <div className="w-10 h-10 bg-pink-icon rounded-[10.8px] flex items-center justify-center flex-shrink-0">
          <Image src="/quest/quest-icon.svg" alt={name} width={32} height={32} />
        </div>

        <PointsBadge points={points} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2">
        <h3 className="font-barlow font-medium text-base leading-[108%] tracking-[-0.03em] capitalize text-grey-1000">
          {name}
        </h3>
        <p className="font-barlow font-normal text-sm leading-5 text-grey-900 line-clamp-2">{description}</p>
      </div>
    </div>
  );
}
