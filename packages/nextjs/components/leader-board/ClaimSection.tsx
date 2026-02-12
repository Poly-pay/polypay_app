"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CAMPAIGN_START } from "@polypay/shared";
import { chain } from "~~/utils/network-config";

interface ClaimSectionProps {
  week: number;
  claimData?: {
    isClaimed: boolean;
    rewardZen: number;
    txHash?: string;
  };
  onClaim: () => void;
}

export const ClaimSection = ({ week, claimData, onClaim }: ClaimSectionProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);

  // Calculate week start and end times
  const { weekStart, weekEnd } = useMemo(() => {
    const start = new Date(CAMPAIGN_START);
    start.setDate(start.getDate() + (week - 1) * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return { weekStart: start, weekEnd: end };
  }, [week]);

  // Format end date for display
  const endDateFormatted = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    };
    return weekEnd.toLocaleString("en-US", options);
  }, [weekEnd]);

  // Update timer and progress every second
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diffMs = weekEnd.getTime() - now.getTime();
      const totalMs = weekEnd.getTime() - weekStart.getTime();
      const elapsedMs = now.getTime() - weekStart.getTime();

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setProgress(100);
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
      setProgress(Math.min((elapsedMs / totalMs) * 100, 100));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [weekStart, weekEnd]);

  // Format time with leading zeros
  const formatTime = (value: number) => value.toString().padStart(2, "0");

  // Determine button state
  const isWeekEnded = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const isClaimed = claimData?.isClaimed ?? false;
  const canClaim = isWeekEnded && !isClaimed;

  // Claimed amount
  const claimedAmount = claimData?.rewardZen ?? 0;
  const txHash = claimData?.txHash;

  return (
    <div className="flex flex-col justify-center items-start p-4 gap-8 w-[650px] bg-white border border-grey-100 rounded-2xl">
      {/* Top row */}
      <div className="flex flex-row justify-between items-start w-full gap-3">
        {/* Left side - Timer */}
        <div className="flex flex-col justify-between items-start gap-3 flex-1">
          <span className="font-barlow font-medium text-sm leading-5 tracking-[-0.04em] text-grey-500">
            Claim available in
          </span>
          <div className="flex flex-row items-center gap-3">
            <span className="font-family-repetition text-[40px] leading-10 tracking-[-0.02em] text-main-violet">
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
          </div>
        </div>

        {/* Right side - Claim info */}
        <div className="flex flex-col justify-between items-end gap-3">
          {/* Claimed this week */}
          <div className="flex flex-row items-center gap-2">
            <span className="font-barlow font-medium text-sm leading-5 tracking-[-0.04em] text-grey-500">
              Claimed this week:
            </span>
            <div className="flex flex-row items-center gap-3">
              <div className="flex flex-row items-center gap-1">
                <Image src="/token/zen.svg" width={20} height={20} alt="ZEN" className="rounded-full" />
                <span className="font-barlow font-medium text-sm leading-5 tracking-[-0.04em] text-grey-1000">
                  {isClaimed ? claimedAmount.toLocaleString() : 0} ZEN
                </span>
              </div>
              {txHash && (
                <a href={`${chain.blockExplorers.default.url}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                  <Image src="/leader-board/external-link.svg" width={20} height={20} alt="View transaction" />
                </a>
              )}
            </div>
          </div>

          {/* Claim button */}
          <button
            onClick={onClaim}
            disabled={!canClaim}
            className={`flex flex-row justify-center items-center px-6 py-2 gap-2 min-w-[90px] h-9 rounded-lg font-barlow font-medium text-sm leading-5 tracking-[-0.04em] text-white transition-colors ${
              isClaimed
                ? "bg-grey-500 cursor-not-allowed"
                : canClaim
                  ? "bg-grey-1000 hover:bg-grey-900 cursor-pointer"
                  : "bg-grey-1000 opacity-20 cursor-not-allowed"
            }`}
          >
            {isClaimed ? "Claimed" : "Claim"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col items-start gap-2.5 w-full">
        <div className="w-full h-[18px] bg-grey-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear animate-stripe"
            style={{
              width: `${Math.max(progress, 1)}%`,
              background: `repeating-linear-gradient(
                45deg,
                #F14CFF,
                #F14CFF 8px,
                rgba(255, 255, 255, 0.2) 8px,
                rgba(255, 255, 255, 0.2) 10px
              )`,
              backgroundSize: "20px 20px",
              backgroundColor: "#F14CFF",
            }}
          />
        </div>
        <span className="font-barlow italic font-normal text-base leading-[18px] tracking-[-0.005em] text-grey-1000">
          Ends {endDateFormatted}
        </span>
      </div>
    </div>
  );
};
