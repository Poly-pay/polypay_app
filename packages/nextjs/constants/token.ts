export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

// Native ETH (use zero address to identify)
export const NATIVE_ETH: Token = {
  address: "0x0000000000000000000000000000000000000000",
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  icon: "/token/eth.svg",
};

// Sepolia testnet tokens
export const SUPPORTED_TOKENS: Token[] = [
  NATIVE_ETH,
  {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC Sepolia address
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    icon: "/token/usdc.svg",
  },
  {
    address: "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4", // EURC Sepolia address
    symbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
    icon: "/token/eurc.svg",
  },
];

// Helper: Get token by address
export function getTokenByAddress(address: string | null | undefined): Token {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return NATIVE_ETH;
  }
  return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase()) || NATIVE_ETH;
}

// Helper: Get token by symbol
export function getTokenBySymbol(symbol: string): Token {
  return SUPPORTED_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || NATIVE_ETH;
}

// Helper: Format amount with decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const decPart = value % divisor;

  if (decPart === 0n) {
    return intPart.toString();
  }

  const decStr = decPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${intPart}.${decStr}`;
}

// Helper: Parse amount to wei/smallest unit
export function parseTokenAmount(amount: string, decimals: number): string {
  const [intPart, decPart = ""] = amount.split(".");
  const paddedDec = decPart.padEnd(decimals, "0").slice(0, decimals);
  const value = BigInt(intPart + paddedDec);
  return value.toString();
}
