/**
 * Claimable week information
 */
export interface ClaimableWeek {
  week: number;
  rank: number;
  rewardUsd: number;
  rewardZen: number;
  isClaimed: boolean;
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

// /**
//  * Claim request payload
//  */
// export interface ClaimRequest {
//   toAddress: string;
// }

/**
 * Claim response
 */
export interface ClaimResponse {
  success: boolean;
  txHash: string;
  totalZen: number;
  weeksClaimed: number[];
}
