export type TokenAddresses = Record<number, string>;

export interface Token {
  addresses: TokenAddresses;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  coingeckoId: string;
}

export interface ResolvedToken extends Omit<Token, "addresses"> {
  address: string;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Chain IDs
const HORIZEN_MAINNET = 26514;
const HORIZEN_TESTNET = 2651420;
const BASE_MAINNET = 8453;
const BASE_SEPOLIA = 84532;

const ALL_CHAIN_IDS = [
  HORIZEN_MAINNET,
  HORIZEN_TESTNET,
  BASE_MAINNET,
  BASE_SEPOLIA,
];

export const NATIVE_ETH: Token = {
  addresses: Object.fromEntries(ALL_CHAIN_IDS.map((id) => [id, ZERO_ADDRESS])),
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  icon: "/token/eth.svg",
  coingeckoId: "ethereum",
};

export const ZEN_TOKEN: Token = {
  addresses: {
    [HORIZEN_TESTNET]: "0xb06EC4ce262D8dbDc24Fac87479A49A7DC4cFb87",
    [HORIZEN_MAINNET]: "0x57da2D504bf8b83Ef304759d9f2648522D7a9280",
    [BASE_MAINNET]: "0xf43eB8De897Fbc7F2502483B2Bef7Bb9EA179229",
    [BASE_SEPOLIA]: "0x107fdE93838e3404934877935993782F977324BB",
  },
  symbol: "ZEN",
  name: "Horizen",
  decimals: 18,
  icon: "/token/zen.svg",
  coingeckoId: "zencash",
};

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

// USDC - USD Coin (Horizen testnet / mainnet)
export const USDC_TOKEN: Token = {
  addresses: {
    [HORIZEN_TESTNET]: "0x01c7AEb2A0428b4159c0E333712f40e127aF639E",
    [HORIZEN_MAINNET]: "0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c",
    [BASE_MAINNET]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    [BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  icon: "/token/usdc.svg",
  coingeckoId: "usd-coin",
};

export const SUPPORTED_TOKENS_BASE: Token[] = [
  NATIVE_ETH,
  ZEN_TOKEN,
  USDC_TOKEN,
];

export function getCoingeckoIds(): string[] {
  return SUPPORTED_TOKENS_BASE.map((t) => t.coingeckoId);
}

function resolveToken(token: Token, chainId: number): ResolvedToken {
  return {
    address: token.addresses[chainId],
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    icon: token.icon,
    coingeckoId: token.coingeckoId,
  };
}

export function getSupportedTokens(chainId: number): ResolvedToken[] {
  return SUPPORTED_TOKENS_BASE.filter(
    (token) => token.addresses[chainId] !== undefined,
  ).map((token) => resolveToken(token, chainId));
}

export function getNativeEth(chainId: number): ResolvedToken {
  return resolveToken(NATIVE_ETH, chainId);
}

export function getTokenByAddress(
  address: string | null | undefined,
  chainId: number,
): ResolvedToken {
  const nativeEth = getNativeEth(chainId);

  if (!address || address === ZERO_ADDRESS) {
    return nativeEth;
  }

  const tokens = getSupportedTokens(chainId);
  return (
    tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) ||
    nativeEth
  );
}

export function getTokenBySymbol(
  symbol: string,
  chainId: number,
): ResolvedToken {
  const tokens = getSupportedTokens(chainId);
  const nativeEth = getNativeEth(chainId);

  return (
    tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()) ||
    nativeEth
  );
}

export function getTokenByCoingeckoId(
  coingeckoId: string,
  chainId: number,
): ResolvedToken | undefined {
  const tokens = getSupportedTokens(chainId);
  return tokens.find((t) => t.coingeckoId === coingeckoId);
}

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

const STABLECOINS = ["USDC", "USDT"];

function getDisplayPrecision(value: number, tokenSymbol?: string): number {
  if (tokenSymbol && STABLECOINS.includes(tokenSymbol.toUpperCase())) return 2;
  if (value >= 1000) return 2;
  if (value >= 100) return 4;
  if (value >= 10) return 5;
  if (value >= 1) return 6;
  return 8;
}

export function formatDisplayValue(
  value: string,
  tokenSymbol?: string,
): string {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return "0";

  const isStable =
    tokenSymbol && STABLECOINS.includes(tokenSymbol.toUpperCase());
  const precision = getDisplayPrecision(num, tokenSymbol);

  if (num > 0 && isStable && num < 0.01) return "< 0.01";
  if (num > 0 && num < 1e-8) return "< 0.00000001";

  const formatted = num.toFixed(precision);
  return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function formatDisplayAmount(
  amount: string,
  decimals: number,
  tokenSymbol?: string,
): string {
  const full = formatTokenAmount(amount, decimals);
  return formatDisplayValue(full, tokenSymbol);
}

export function parseTokenAmount(amount: string, decimals: number): string {
  const [intPart, decPart = ""] = amount.split(".");
  const paddedDec = decPart.padEnd(decimals, "0").slice(0, decimals);
  const value = BigInt(intPart + paddedDec);
  return value.toString();
}
