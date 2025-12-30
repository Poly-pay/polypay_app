"use client";

import { useEffect, useState } from "react";
import Routes from "~~/configs/routes.config";
import { useAppRouter } from "~~/hooks/app/useRouteApp";

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useAppRouter();

  useEffect(() => {
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
