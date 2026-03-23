// ZEN token addresses per network
export const ZEN_TOKEN_ADDRESS: Record<string, string> = {
  testnet: '0x4b36cb6E7c257E9aA246122a997be0F7Dc1eFCd1',
  mainnet: '0x57da2D504bf8b83Ef304759d9f2648522D7a9280',
};

// ZEN token decimals
export const ZEN_DECIMALS = 18;

// ZEN CoinGecko ID
export const ZEN_COINGECKO_ID = 'zencash';

// Quest points
export const QUEST_POINTS_ACCOUNT_FIRST_TX = 100;
export const QUEST_POINTS_SUCCESSFUL_TX = 50;

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = [2651420, 84532, 26514, 8453];

// External APIs
export const COINGECKO_API_URL =
  'https://api.coingecko.com/api/v3/simple/price';

// Explorer URLs
export const EXPLORER_URLS = {
  mainnet: {
    ZKVERIFY_EXPLORER: 'https://zkverify.subscan.io/tx',
    HORIZEN_EXPLORER_ADDRESS: 'https://horizen.calderaexplorer.xyz/address',
    HORIZEN_EXPLORER_TX: 'https://horizen.calderaexplorer.xyz/tx',
    BASE_EXPLORER_ADDRESS: 'https://basescan.org/address',
    BASE_EXPLORER_TX: 'https://basescan.org/tx',
  },
  testnet: {
    ZKVERIFY_EXPLORER: 'https://zkverify-testnet.subscan.io/tx',
    HORIZEN_EXPLORER_ADDRESS:
      'https://horizen-testnet.explorer.caldera.xyz/address',
    HORIZEN_EXPLORER_TX: 'https://horizen-testnet.explorer.caldera.xyz/tx',
    BASE_EXPLORER_ADDRESS: 'https://sepolia.basescan.org/address',
    BASE_EXPLORER_TX: 'https://sepolia.basescan.org/tx',
  },
} as const;
