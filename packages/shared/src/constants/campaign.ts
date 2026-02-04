// ==================== Campaign Config ====================

// Campaign start date
// Note: TODO: Update this for production
export const CAMPAIGN_START = new Date('2026-02-06');

// Total campaign weeks
export const TOTAL_CAMPAIGN_WEEKS = 6;

// Weekly reward pool in USD
export const WEEKLY_REWARD_POOL = 700;

// ==================== Reward Percentages ====================

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

// ==================== Week Helpers ====================

/**
 * Get current week number (1-6)
 * Returns 0 if campaign hasn't started
 * Returns 7 if campaign has ended
 */
export function getCurrentWeek(): number {
  const now = new Date();
  const diffMs = now.getTime() - CAMPAIGN_START.getTime();

  if (diffMs < 0) return 0; // Campaign hasn't started

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  if (week > TOTAL_CAMPAIGN_WEEKS) return TOTAL_CAMPAIGN_WEEKS + 1; // Campaign ended

  return week;
}

/**
 * Get list of completed weeks (can be claimed)
 */
export function getCompletedWeeks(): number[] {
  const currentWeek = getCurrentWeek();

  if (currentWeek === 0) return []; // Campaign hasn't started

  // Completed weeks are all weeks before current week
  const completedWeeks: number[] = [];
  for (let i = 1; i < currentWeek && i <= TOTAL_CAMPAIGN_WEEKS; i++) {
    completedWeeks.push(i);
  }

  return completedWeeks;
}

/**
 * Get last completed week (for showing claim button)
 * Returns null if no weeks completed yet
 */
export function getLastCompletedWeek(): number | null {
  const completedWeeks = getCompletedWeeks();
  if (completedWeeks.length === 0) return null;
  return completedWeeks[completedWeeks.length - 1];
}

/**
 * Get available weeks for viewing (completed + current)
 */
export function getAvailableWeeks(): number[] {
  const currentWeek = getCurrentWeek();

  if (currentWeek === 0) return []; // Campaign hasn't started

  const availableWeeks: number[] = [];
  const maxWeek = Math.min(currentWeek, TOTAL_CAMPAIGN_WEEKS);

  for (let i = 1; i <= maxWeek; i++) {
    availableWeeks.push(i);
  }

  return availableWeeks;
}

/**
 * Check if a week is available for viewing
 */
export function isWeekAvailable(week: number): boolean {
  const availableWeeks = getAvailableWeeks();
  return availableWeeks.includes(week);
}

/**
 * Format campaign start date for display
 */
export function formatCampaignStartDate(): string {
  return CAMPAIGN_START.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get week date range
 */
export function getWeekDateRange(week: number): { start: Date; end: Date } {
  const start = new Date(CAMPAIGN_START);
  start.setDate(start.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}
