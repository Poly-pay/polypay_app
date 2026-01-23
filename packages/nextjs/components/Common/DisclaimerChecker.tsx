"use client";

import { useEffect, useRef } from "react";
import { useModalApp } from "~~/hooks";
import { useDisclaimerStore } from "~~/services/store/disclaimerStore";

export const DisclaimerChecker = () => {
  const { openModal } = useModalApp();
  const hasHydrated = useDisclaimerStore(state => state._hasHydrated);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      // Check inside timeout to avoid Strict Mode issues
      if (hasOpenedRef.current) return;

      const shouldShow = useDisclaimerStore.getState().shouldShowDisclaimer();
      if (shouldShow) {
        hasOpenedRef.current = true;
        openModal("disclaimer");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasHydrated, openModal]);

  return null;
};
