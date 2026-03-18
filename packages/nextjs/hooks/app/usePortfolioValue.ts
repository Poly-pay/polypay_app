import { useMemo } from "react";
import { ResolvedToken } from "@polypay/shared";

export function usePortfolioValue(
  tokens: ResolvedToken[],
  balances: Record<string, string>,
  getPriceBySymbol: (symbol: string) => number,
) {
  const totalUsdValue = useMemo(() => {
    return tokens.reduce((sum, token) => {
      const balance = balances[token.address] || "0";
      const price = getPriceBySymbol(token.symbol);
      return sum + parseFloat(balance) * price;
    }, 0);
  }, [balances, getPriceBySymbol, tokens]);

  const getTokenUsdValue = (token: ResolvedToken): number => {
    const balance = balances[token.address] || "0";
    const price = getPriceBySymbol(token.symbol);
    return parseFloat(balance) * price;
  };

  const getTokenBalance = (token: ResolvedToken): string => {
    return balances[token.address] || "0";
  };

  return { totalUsdValue, getTokenUsdValue, getTokenBalance };
}
