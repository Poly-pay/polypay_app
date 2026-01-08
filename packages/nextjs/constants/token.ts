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

// Horizen testnet tokens
export const SUPPORTED_TOKENS: Token[] = [
  NATIVE_ETH,
  {
    address: "0x01c7AEb2A0428b4159c0E333712f40e127aF639E", // USDC Horizen testnet address
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    icon: "/token/usdc.svg",
  },
  {
    address: "0x15d70535a71Dba52b572EbF746c7C2F5806ACd0e", // USDT Horizen testnet address
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    icon: "/token/usdt.svg",
  },
  {
    address: "0xFac500d99a2e696e4781D6960A1fDD0189A0c85a",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    icon: "/token/dai.svg",
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
