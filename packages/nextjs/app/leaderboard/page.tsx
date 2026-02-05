"use client";

import { useState } from "react";
import { formatCampaignStartDate, getAvailableWeeks, getCurrentWeek, getLastCompletedWeek } from "@polypay/shared";
import type { LeaderboardFilter } from "@polypay/shared";
import { NextPage } from "next";
import { SectionAvatar } from "~~/components/leader-board";
import { LeaderBoardTable } from "~~/components/leader-board/LeaderBoardTable";
import { useModalApp } from "~~/hooks";
import { useClaimSummary } from "~~/hooks/api/useClaim";

const WEEKS = [1, 2, 3, 4, 5, 6];

const LeaderBoardPage: NextPage = () => {
  const [filter, setFilter] = useState<LeaderboardFilter>("weekly");
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const lastCompleted = getLastCompletedWeek();
    const available = getAvailableWeeks();
    return lastCompleted || available[0] || 1;
  });
  const { openModal } = useModalApp();

  // Get campaign state
  const currentWeek = getCurrentWeek();
  const availableWeeks = getAvailableWeeks();
  const lastCompletedWeek = getLastCompletedWeek();
  const campaignNotStarted = currentWeek === 0;

  // Fetch claim summary to check if user has claimed
  const { data: claimSummary } = useClaimSummary();

  // Check if selected week has reward (claimed or not)
  const selectedWeekData = claimSummary?.weeks.find(w => w.week === selectedWeek);
  const isWeekClaimed = selectedWeekData?.isClaimed ?? false;
  const hasRewardForSelectedWeek = selectedWeekData && selectedWeekData.rewardZen > 0;

  // Show claim button when viewing a completed week that has reward (show "Claimed" if already claimed)
  const showClaimButton =
    filter === "weekly" && lastCompletedWeek !== null && selectedWeek <= lastCompletedWeek && hasRewardForSelectedWeek;

  // Get week param only when filter is weekly
  const weekParam = filter === "weekly" ? selectedWeek : undefined;

  const handleClaim = () => {
    if (!claimSummary) return;
    openModal("claimReward", { week: selectedWeek });
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
          <div className="flex flex-col gap-3">
            {/* Campaign not started message */}
            {campaignNotStarted && (
              <div className="text-grey-600 text-sm">Campaign starts on {formatCampaignStartDate()}</div>
            )}

            {/* Week buttons */}
            <div className="flex items-start gap-4">
              {WEEKS.map(week => {
                const isAvailable = availableWeeks.includes(week);
                const isSelected = selectedWeek === week;

                // Check if this week has unclaimed reward (for pink dot)
                const weekData = claimSummary?.weeks.find(w => w.week === week);
                const isCompleted = lastCompletedWeek !== null && week <= lastCompletedWeek;
                const showPinkDot = isCompleted && weekData && !weekData.isClaimed && weekData.rewardZen > 0;

                return (
                  <button
                    key={week}
                    onClick={() => isAvailable && setSelectedWeek(week)}
                    disabled={!isAvailable}
                    className={`relative px-4 py-2 rounded-lg font-barlow font-medium text-sm leading-5 tracking-[-0.04em] transition-colors ${
                      isSelected
                        ? "bg-grey-1000 text-white"
                        : isAvailable
                          ? "bg-grey-100 text-grey-1000 hover:bg-grey-200"
                          : "bg-grey-50 text-grey-400 cursor-not-allowed"
                    }`}
                  >
                    Week {week}
                    {/* Pink dot indicator for unclaimed reward */}
                    {showPinkDot && <span className="absolute -top-1 -right-1 w-3 h-3 bg-main-pink rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className=" w-[650px] p-10 rounded-3xl bg-white border border-grey-100 space-y-10">
        {campaignNotStarted ? (
          <div className="flex items-center justify-center h-[300px] text-grey-500">
            Campaign has not started yet. Please check back on {formatCampaignStartDate()}.
          </div>
        ) : (
          <>
            <SectionAvatar filter={filter} week={weekParam} />
            <LeaderBoardTable
              filter={filter}
              week={weekParam}
              isClaimed={isWeekClaimed}
              showClaimButton={showClaimButton}
              onClaim={handleClaim}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderBoardPage;
