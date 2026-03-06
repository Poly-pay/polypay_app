import { useQuery } from "@tanstack/react-query";
import { PRICE_REFETCH_INTERVAL, QUERY_STALE_TIME } from "~~/constants/timing";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { priceApi } from "~~/services/api/priceApi";

export const priceKeys = {
  all: ["prices"] as const,
};

export const usePrices = () => {
  return useQuery({
    queryKey: priceKeys.all,
    queryFn: () => priceApi.getPrices(),
    staleTime: QUERY_STALE_TIME,
    refetchInterval: PRICE_REFETCH_INTERVAL,
  });
};

// Helper hook: Get price utilities
export const useTokenPrices = () => {
  const { data: prices = {}, isLoading, error } = usePrices();
  const { tokens } = useNetworkTokens();

  const getPriceBySymbol = (symbol: string): number => {
    const token = tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (!token) return 0;
    return prices[token.coingeckoId] || 0;
  };

  const getUsdValue = (symbol: string, amount: number): number => {
    return amount * getPriceBySymbol(symbol);
  };

  return {
    prices,
    isLoading,
    error,
    getPriceBySymbol,
    getUsdValue,
  };
};
