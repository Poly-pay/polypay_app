"use client";

import { useEffect, useState } from "react";
import { QuestCategory } from "@polypay/shared";
import QuestIntroModal from "~~/components/modals/QuestIntroModal";
import { ComingSoon, QuestCard, QuestSection } from "~~/components/quest";
import { QuestFloatingButton } from "~~/components/quest/QuestFloatingButton";
import { useQuests } from "~~/hooks/api";
import { useQuestIntroStore } from "~~/services/store/questIntroStore";

export default function QuestPage() {
  const { data: quests, isLoading } = useQuests();
  const { hasSeenIntro, _hasHydrated } = useQuestIntroStore();
  const [showIntroModal, setShowIntroModal] = useState(false);

  const featuredQuests = quests?.filter(q => q.type === QuestCategory.RECURRING) ?? [];
  const dailyQuests = quests?.filter(q => q.type === QuestCategory.DAILY) ?? [];

  // Show intro modal on first visit
  useEffect(() => {
    if (_hasHydrated && !hasSeenIntro) {
      setShowIntroModal(true);
    }
  }, [_hasHydrated, hasSeenIntro]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-main-navyBlue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-[1144px] mx-auto p-[30px_100px] bg-white/70 border-2 border-white rounded-2xl flex flex-col gap-10">
      {/* Page title */}
      <h1 className="font-barlow font-normal text-4xl leading-[100%] tracking-[-0.03em] capitalize text-grey-1000">
        All Quests
      </h1>

      {/* Featured Quests */}
      <QuestSection title="Featured Quests">
        <div className="flex flex-row gap-4">
          {featuredQuests.length > 0 ? (
            featuredQuests.map(quest => (
              <QuestCard key={quest.id} name={quest.name} description={quest.description ?? ""} points={quest.points} />
            ))
          ) : (
            <p className="text-grey-500">No featured quests available</p>
          )}
        </div>
      </QuestSection>

      {/* Daily Quests */}
      <QuestSection title="Daily Quests">
        {dailyQuests.length > 0 ? (
          <div className="flex flex-row gap-4">
            {dailyQuests.map(quest => (
              <QuestCard key={quest.id} name={quest.name} description={quest.description ?? ""} points={quest.points} />
            ))}
          </div>
        ) : (
          <ComingSoon />
        )}
      </QuestSection>

      <QuestIntroModal isOpen={showIntroModal} onClose={() => setShowIntroModal(false)} />
      <QuestFloatingButton />
    </div>
  );
}
