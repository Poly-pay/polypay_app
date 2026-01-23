import { create } from "zustand";
import { persist } from "zustand/middleware";

const DAYS_TO_HIDE = 30;

interface DisclaimerState {
  // Persisted
  agreedAt: number | null;
  dontShowFor30Days: boolean;
  _hasHydrated: boolean;

  // NOT persisted - reset on refresh
  agreedThisSession: boolean;

  // Methods
  shouldShowDisclaimer: () => boolean;
  canProceed: () => boolean;
  agreeDisclaimer: (dontShowFor30Days: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useDisclaimerStore = create<DisclaimerState>()(
  persist(
    (set, get) => ({
      // Persisted
      agreedAt: null,
      dontShowFor30Days: false,
      _hasHydrated: false,

      // NOT persisted - always starts false on refresh
      agreedThisSession: false,

      shouldShowDisclaimer: () => {
        const { agreedAt, dontShowFor30Days, agreedThisSession } = get();

        // Already agreed this session - don't show
        if (agreedThisSession) return false;

        // Never agreed - show
        if (!agreedAt) return true;

        // Agreed but didn't tick "don't show" - show every refresh
        if (!dontShowFor30Days) return true;

        // Check if 30 days have passed
        const daysSinceAgreed = (Date.now() - agreedAt) / (1000 * 60 * 60 * 24);
        return daysSinceAgreed > DAYS_TO_HIDE;
      },

      canProceed: () => {
        const { agreedThisSession, agreedAt, dontShowFor30Days } = get();

        // Agreed this session - can proceed
        if (agreedThisSession) return true;

        // Check if user has valid 30-day agreement
        if (agreedAt && dontShowFor30Days) {
          const daysSinceAgreed = (Date.now() - agreedAt) / (1000 * 60 * 60 * 24);
          return daysSinceAgreed <= DAYS_TO_HIDE;
        }

        return false;
      },

      agreeDisclaimer: (dontShowFor30Days: boolean) =>
        set({
          agreedAt: Date.now(),
          dontShowFor30Days,
          agreedThisSession: true,
        }),

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: "polypay-disclaimer",
      partialize: state => ({
        agreedAt: state.agreedAt,
        dontShowFor30Days: state.dontShowFor30Days,
      }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
