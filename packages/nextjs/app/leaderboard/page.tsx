"use client";

import { useState } from "react";
import type { LeaderboardFilter } from "@polypay/shared";
import { NextPage } from "next";
import { SectionAvatar } from "~~/components/leader-board";
import { LeaderBoardTable } from "~~/components/leader-board/LeaderBoardTable";
import { useModalApp } from "~~/hooks";
import { useLeaderboardMe } from "~~/hooks/api/useQuest";

const WEEKS = [1, 2, 3, 4, 5, 6];

const LeaderBoardPage: NextPage = () => {
  const [filter, setFilter] = useState<LeaderboardFilter>("weekly");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isClaimed, setIsClaimed] = useState(false);
  const { openModal } = useModalApp();

  // Get week param only when filter is weekly
  const weekParam = filter === "weekly" ? selectedWeek : undefined;

  // Fetch current user for claim modal
  const { data: myPoints } = useLeaderboardMe(filter, weekParam);

  const handleClaim = () => {
    openModal("claimReward", {
      amount: 100,
      tokenSymbol: "ZEN",
      toAddress: myPoints?.commitment || "Unknown",
      onConfirm: () => {
        console.log("Claim confirmed");
        setIsClaimed(true);
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-barlow font-normal text-4xl leading-[100%] tracking-[-0.03em] capitalize text-grey-1000">
            Leaderboard
          </h3>

          {/* Filter Tabs */}
          <div className="flex items-center p-1 gap-2 bg-grey-100 rounded-xl">
            <button
              onClick={() => setFilter("weekly")}
              className={`px-6 py-2 rounded-lg font-barlow text-sm tracking-[-0.04em] transition-colors ${
                filter === "weekly"
                  ? "bg-white font-semibold text-grey-1000"
                  : "bg-transparent font-medium text-grey-800 hover:text-grey-1000"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setFilter("all-time")}
              className={`px-6 py-2 rounded-lg font-barlow text-sm tracking-[-0.04em] transition-colors ${
                filter === "all-time"
                  ? "bg-white font-semibold text-grey-1000"
                  : "bg-transparent font-medium text-grey-800 hover:text-grey-1000"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Week Buttons - Only show when filter is "weekly" */}
        {filter === "weekly" && (
          <div className="flex items-start gap-4">
            {WEEKS.map(week => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`px-4 py-2 rounded-lg font-barlow font-medium text-sm leading-5 tracking-[-0.04em] transition-colors ${
                  selectedWeek === week ? "bg-grey-1000 text-white" : "bg-grey-100 text-grey-1000 hover:bg-grey-200"
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-10 rounded-3xl bg-white border border-grey-100 space-y-10">
        <SectionAvatar filter={filter} week={weekParam} />
        <LeaderBoardTable filter={filter} week={weekParam} isClaimed={isClaimed} onClaim={handleClaim} />
      </div>
    </div>
  );
};

export default LeaderBoardPage;
