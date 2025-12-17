import { formatTokenAmount, getTokenByAddress } from "~~/constants";

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
 * @returns Shortened address like "0x1234...5678"
 */
export function formatAddress(address: string): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
