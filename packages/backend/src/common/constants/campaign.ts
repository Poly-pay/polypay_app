// Weekly reward pool in USD
export const WEEKLY_REWARD_POOL = 700;

// Campaign start date
// Note: TODO: Update this for production
export const CAMPAIGN_START = new Date('2026-02-06');

// Total campaign weeks
export const TOTAL_CAMPAIGN_WEEKS = 6;

// Reward percentages by rank (top 1-5)
const TOP_REWARD_PERCENTAGES: Record<number, number> = {
  1: 10,
  2: 7,
  3: 5,
  4: 4,
  5: 4,
};

/**
 * Get reward percentage for a given rank
 * - Top 1: 10%
 * - Top 2: 7%
 * - Top 3: 5%
 * - Top 4-5: 4% each
 * - Top 6-20: 2% each (30% / 15 users)
 * - Top 21-50: ~0.833% each (25% / 30 users)
 * - Top 51-100: 0.3% each (15% / 50 users)
 * - Rank > 100: 0%
 */
export function getRewardPercentage(rank: number): number {
  if (rank < 1 || rank > 100) return 0;
  if (rank <= 5) return TOP_REWARD_PERCENTAGES[rank];
  if (rank <= 20) return 2;
  if (rank <= 50) return 25 / 30; // ~0.833
  return 15 / 50; // 0.3
}

/**
 * Calculate reward USD for a given rank
 */
export function calculateRewardUsd(rank: number): number {
  const percentage = getRewardPercentage(rank);
  return (WEEKLY_REWARD_POOL * percentage) / 100;
}

// ZEN token addresses per network
export const ZEN_TOKEN_ADDRESS: Record<string, string> = {
  testnet: '0x070040A826B586b58569750ED43cb5979b171e8d',
  mainnet: '0x57da2D504bf8b83Ef304759d9f2648522D7a9280',
};

// ZEN token decimals
export const ZEN_DECIMALS = 18;

// ZEN CoinGecko ID
export const ZEN_COINGECKO_ID = 'zencash';
