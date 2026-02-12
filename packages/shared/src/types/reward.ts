/**
 * Claimable week information
 */
export interface ClaimableWeek {
  week: number;
  rank: number;
  rewardUsd: number;
  rewardZen: number;
  isClaimed: boolean;
  txHash?: string;
}

/**
 * Claim summary for a user
 */
export interface ClaimSummary {
  weeks: ClaimableWeek[];
  totalUsd: number;
  totalZen: number;
  zenPrice: number;
}

/**
 * Claim response
 */
export interface ClaimResponse {
  success: boolean;
  txHash: string;
  rewardZen: number;
  weekClaimed: number;
}
