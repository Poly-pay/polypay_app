"use client";

import { useEffect, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useAppRouter();

  useEffect(() => {
    // Mobile blocking is opt-in via env flag; disabled by default so mobile
    // users see the (zoomed-out) desktop layout instead of the /mobile screen.
    if (process.env.NEXT_PUBLIC_ENABLE_MOBILE_BLOCK !== "true") {
      setIsLoading(false);
      return;
    }

    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 780;

      setIsMobile(isMobileDevice);
      setIsLoading(false);

      if (isMobileDevice && router.pathname !== Routes.MOBILE.path) {
        router.goToMobile();
      }
      if (!isMobileDevice && router.pathname === Routes.MOBILE.path) {
        router.goToDashboard();
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [router]);

  return { isMobile, isLoading };
}
