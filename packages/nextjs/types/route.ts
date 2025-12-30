import type Routes from "~~/configs/routes.config";

export type RouteKey = keyof typeof Routes;

export type SubrouteKey<T extends RouteKey> = (typeof Routes)[T] extends { subroutes: infer S }
  ? S extends Record<string, any>
    ? keyof S
    : never
  : never;
