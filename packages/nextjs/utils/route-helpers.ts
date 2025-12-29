import Routes from "~~/configs/routes.config";
import { RouteKey } from "~~/types/route";

export function getRoutePath(routeKey: RouteKey, subrouteKey?: string, params?: Record<string, string>): string {
  const route = Routes[routeKey] as any;
  if (!route) {
    console.warn(`Route ${String(routeKey)} not found`);
    return "/";
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

  return path;
}

export function isRouteComingSoon(routeKey: RouteKey, subrouteKey?: string): boolean {
  const route = Routes[routeKey] as any;
  if (!route) return false;

  const targetRoute = subrouteKey && route.subroutes?.[subrouteKey] ? route.subroutes[subrouteKey] : route;

  return targetRoute.coming || false;
}

export const getDashboardPath = () => Routes.DASHBOARD.path;
export const getNewWalletPath = () => Routes.DASHBOARD.subroutes.NEW_WALLET.path;
export const getAddressBookPath = () => Routes.ADDRESS_BOOK.path;
export const getTransferPath = () => Routes.TRANSFER.path;
export const getBatchPath = () => Routes.BATCH.path;
export const getMobilePath = () => Routes.MOBILE.path;
