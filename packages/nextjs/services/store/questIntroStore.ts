import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QuestIntroState {
  // Persisted
  hasSeenIntro: boolean;
  _hasHydrated: boolean;

  // Methods
  markAsSeen: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useQuestIntroStore = create<QuestIntroState>()(
  persist(
    set => ({
      hasSeenIntro: false,
      _hasHydrated: false,

      markAsSeen: () => set({ hasSeenIntro: true }),

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: "polypay-quest-intro",
      partialize: state => ({
        hasSeenIntro: state.hasSeenIntro,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
