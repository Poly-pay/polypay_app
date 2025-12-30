import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Routes from "~~/configs/routes.config";
import { RouteKey } from "~~/types/route";

export function useAppRouter() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback(
    (routeKey: RouteKey, subrouteKey?: string, params?: Record<string, string>) => {
      const route = Routes[routeKey] as any;
      if (!route) {
        console.warn(`Route ${String(routeKey)} not found`);
        return;
      }

      let path = route.path as string;

      if (subrouteKey && route.subroutes?.[subrouteKey]) {
        path = route.subroutes[subrouteKey].path;
      }

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          path = path.replace(`:${key}`, value);
        });
      }

      const targetRoute = subrouteKey && route.subroutes?.[subrouteKey] ? route.subroutes[subrouteKey] : route;

      if (targetRoute.coming) {
        console.warn(`Route ${String(routeKey)} is coming soon`);
        return;
      }

      router.push(path);
    },
    [router],
  );

  const isActiveRoute = useCallback(
    (routeKey: RouteKey, exact = false) => {
      const route = Routes[routeKey] as any;
      if (!route) return false;

      if (exact) {
        return pathname === route.path;
      }

      if (pathname.startsWith(route.path)) {
        return true;
      }

      return false;
    },
    [pathname],
  );

  const getRoute = useCallback((routeKey: RouteKey, subrouteKey?: string) => {
    const route = Routes[routeKey] as any;
    if (!route) return null;

    if (subrouteKey && route.subroutes?.[subrouteKey]) {
      return route.subroutes[subrouteKey];
    }

    return route;
  }, []);

  const currentRoute = useMemo(() => {
    for (const [key, route] of Object.entries(Routes)) {
      const r = route as any;

      if (pathname === r.path) {
        return { key, route: r, subroute: null };
      }

      if (r.subroutes) {
        for (const [subKey, subroute] of Object.entries(r.subroutes)) {
          const sr = subroute as any;
          if (pathname === sr.path || pathname.startsWith(sr.path)) {
            return { key, route: r, subroute: { key: subKey, route: sr } };
          }
        }
      }

      if (pathname.startsWith(r.path)) {
        return { key, route: r, subroute: null };
      }
    }

    return null;
  }, [pathname]);

  const availableRoutes = useMemo(() => {
    return Object.entries(Routes)
      .filter(([, route]) => !(route as any).coming)
      .map(([key, route]) => ({ key, route }));
  }, []);

  const goBack = useCallback(() => router.back(), [router]);
  const goForward = useCallback(() => router.forward(), [router]);
  const refresh = useCallback(() => router.refresh(), [router]);
  const push = useCallback((path: string) => router.push(path), [router]);

  const goToDashboard = useCallback(() => router.push(Routes.DASHBOARD.path), [router]);
  const goToDashboardNewWallet = useCallback(() => router.push(Routes.DASHBOARD.subroutes.NEW_WALLET.path), [router]);
  const goToAddressBook = useCallback(() => router.push(Routes.ADDRESS_BOOK.path), [router]);
  const goToTransfer = useCallback(() => router.push(Routes.TRANSFER.path), [router]);
  const goToBatch = useCallback(() => router.push(Routes.BATCH.path), [router]);
  const goToMobile = useCallback(() => router.push(Routes.MOBILE.path), [router]);

  return {
    navigateTo,
    goBack,
    goForward,
    refresh,
    push,
    goToDashboard,
    goToDashboardNewWallet,
    goToAddressBook,
    goToTransfer,
    goToBatch,
    goToMobile,
    isActiveRoute,
    currentRoute,
    pathname,
    getRoute,
    availableRoutes,
    Routes,
  };
}
