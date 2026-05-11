import { useQuery } from "@tanstack/react-query";
import { stealthApi } from "~~/services/api";

export const stealthKeys = {
  all: ["stealth"] as const,
  status: (walletAddress: string) => [...stealthKeys.all, "status", walletAddress.toLowerCase()] as const,
};

export function useStealthStatus(walletAddress: string | undefined | null) {
  const normalized = walletAddress?.toLowerCase() ?? "";

  return useQuery({
    queryKey: stealthKeys.status(normalized),
    queryFn: () => stealthApi.getStatus(normalized),
    enabled: !!normalized && /^0x[a-fA-F0-9]{40}$/.test(normalized),
    staleTime: 60_000,
  });
}
