export interface TokenAddresses {
  testnet: string;
  mainnet: string;
}

export interface Token {
  addresses: TokenAddresses;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  coingeckoId: string;
}

// Resolved token with single address (for runtime use)
export interface ResolvedToken extends Omit<Token, "addresses"> {
  address: string;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Native ETH (use zero address to identify)
export const NATIVE_ETH: Token = {
  addresses: {
    testnet: ZERO_ADDRESS,
    mainnet: ZERO_ADDRESS,
  },
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  icon: "/token/eth.svg",
  coingeckoId: "ethereum",
};

// ZEN Token - Horizen native token (wrapped)
export const ZEN_TOKEN: Token = {
  addresses: {
    testnet: "0x4b36cb6E7c257E9aA246122a997be0F7Dc1eFCd1",
    mainnet: "0x57da2D504bf8b83Ef304759d9f2648522D7a9280",
  },
  symbol: "ZEN",
  name: "Horizen",
  decimals: 18,
  icon: "/token/zen.svg",
  coingeckoId: "zencash",
};

// {
//   address: "0x01c7AEb2A0428b4159c0E333712f40e127aF639E", // USDC Horizen testnet address
//   symbol: "USDC",
//   name: "USD Coin",
//   decimals: 6,
//   icon: "/token/usdc.svg",
//   coingeckoId: "usd-coin",
// },
// {
//   address: "0x15d70535a71Dba52b572EbF746c7C2F5806ACd0e", // USDT Horizen testnet address
//   symbol: "USDT",
//   name: "Tether USD",
//   decimals: 6,
//   icon: "/token/usdt.svg",
//   coingeckoId: "tether",
// },
// {
//   address: "0xFac500d99a2e696e4781D6960A1fDD0189A0c85a", // DAI Horizen testnet address
//   symbol: "DAI",
//   name: "Dai Stablecoin",
//   decimals: 18,
//   icon: "/token/dai.svg",
//   coingeckoId: "dai",
// },

// All supported tokens (base definitions)
export const SUPPORTED_TOKENS_BASE: Token[] = [NATIVE_ETH, ZEN_TOKEN];

// Helper: Get all coingecko IDs
export function getCoingeckoIds(): string[] {
  return SUPPORTED_TOKENS_BASE.map((t) => t.coingeckoId);
}

// Helper: Get supported tokens with resolved addresses for a network
export function getSupportedTokens(
  network: "testnet" | "mainnet" = "mainnet",
): ResolvedToken[] {
  return SUPPORTED_TOKENS_BASE.map((token) => ({
    address: token.addresses[network],
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    icon: token.icon,
    coingeckoId: token.coingeckoId,
  }));
}

// Helper: Get native ETH with resolved address
export function getNativeEth(
  network: "testnet" | "mainnet" = "mainnet",
): ResolvedToken {
  return {
    address: NATIVE_ETH.addresses[network],
    symbol: NATIVE_ETH.symbol,
    name: NATIVE_ETH.name,
    decimals: NATIVE_ETH.decimals,
    icon: NATIVE_ETH.icon,
    coingeckoId: NATIVE_ETH.coingeckoId,
  };
}

// Helper: Get token by address
export function getTokenByAddress(
  address: string | null | undefined,
  network: "testnet" | "mainnet" = "mainnet",
): ResolvedToken {
  const nativeEth = getNativeEth(network);

  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return nativeEth;
  }

  const tokens = getSupportedTokens(network);
  return (
    tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) ||
    nativeEth
  );
}

// Helper: Get token by symbol
export function getTokenBySymbol(
  symbol: string,
  network: "testnet" | "mainnet" = "mainnet",
): ResolvedToken {
  const tokens = getSupportedTokens(network);
  const nativeEth = getNativeEth(network);

  return (
    tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()) ||
    nativeEth
  );
}

// Helper: Get token by coingecko ID
export function getTokenByCoingeckoId(
  coingeckoId: string,
  network: "testnet" | "mainnet" = "mainnet",
): ResolvedToken | undefined {
  const tokens = getSupportedTokens(network);
  return tokens.find((t) => t.coingeckoId === coingeckoId);
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
