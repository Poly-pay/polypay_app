import { formatTokenAmount, getTokenByAddress } from "@polypay/shared";

/**
 * Format amount with token symbol
 * @param amount - Amount in smallest unit (wei, etc.)
 * @param tokenAddress - Token contract address (null/undefined = native ETH)
 * @returns Formatted string like "1.5 ETH" or "100 USDC"
 */
export function formatAmount(amount: string, tokenAddress?: string | null): string {
  try {
    const token = getTokenByAddress(tokenAddress);
    const formatted = formatTokenAmount(amount, token.decimals);
    return `${formatted} ${token.symbol}`;
  } catch {
    return amount;
  }
}

/**
 * Format address to short form
 * @param address - Full address
 * @param options - Slice options { start: number, end: number }
 * @returns Shortened address like "0x1234...5678"
 */
export function formatAddress(address: string, options?: { start?: number; end?: number }): string {
  if (!address) return "";

  const start = options?.start ?? 6;
  const end = options?.end ?? 4;
  const minLength = start + end;

  if (address.length <= minLength) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
