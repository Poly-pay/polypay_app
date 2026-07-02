"use client";

import { useArcAuth } from "./useArcAuth";
import { arcAccountKeys } from "./useArcCreateAccount";
import { useQuery } from "@tanstack/react-query";
import { arcApi } from "~~/services/api";

// List of the caller's Arc (ECDSA) multisig accounts. Reuses arcAccountKeys
// from useArcCreateAccount.ts so account creation invalidates this query.
export const useArcAccounts = () => {
  const { isAuthenticated } = useArcAuth();

  return useQuery({
    queryKey: arcAccountKeys.all,
    queryFn: arcApi.getAccounts,
    enabled: isAuthenticated,
  });
};
