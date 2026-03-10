"use client";

import { useQuery } from "@tanstack/react-query";
import { mixerApi } from "~~/services/api/mixerApi";

interface PoolStatsProps {
  chainId: number;
  token: string;
  denomination: string;
  label?: string;
}

export function PoolStats({ chainId, token, denomination, label }: PoolStatsProps) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["mixer-deposit-count", chainId, token, denomination],
    queryFn: () => mixerApi.getDepositCount(chainId, token, denomination),
    enabled: !!chainId && !!token && !!denomination,
  });

  if (isLoading) return <span className="text-grey-400 text-xs">...</span>;
  return (
    <span className="text-grey-500 text-xs">
      {label ?? "Anonymity set"}: {count ?? 0} deposit{(count ?? 0) !== 1 ? "s" : ""}
    </span>
  );
}
