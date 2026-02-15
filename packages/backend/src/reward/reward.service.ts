import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PriceService } from '@/price/price.service';
import {
  ClaimableWeek,
  ClaimSummary,
  CAMPAIGN_START,
  TOTAL_CAMPAIGN_WEEKS,
  calculateRewardUsd,
} from '@polypay/shared';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    private prisma: PrismaService,
    private priceService: PriceService,
  ) {}

  /**
   * Get current week number (1-2)
   * Returns 0 if campaign hasn't started
   * Returns 7 if campaign has ended
   */
  getCurrentWeek(): number {
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
  getCompletedWeeks(): number[] {
    const currentWeek = this.getCurrentWeek();

    if (currentWeek === 0) return []; // Campaign hasn't started

    // Completed weeks are all weeks before current week
    const completedWeeks: number[] = [];
    for (let i = 1; i < currentWeek && i <= TOTAL_CAMPAIGN_WEEKS; i++) {
      completedWeeks.push(i);
    }

    return completedWeeks;
  }

  /**
   * Get week date range
   */
  getWeekDateRange(week: number): { start: Date; end: Date } {
    const start = new Date(CAMPAIGN_START);
    start.setDate(start.getDate() + (week - 1) * 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return { start, end };
  }

  /**
   * Get user rank for a specific week
   */
  async getUserRankForWeek(
    commitment: string,
    week: number,
  ): Promise<number | null> {
    // Get user by commitment
    const user = await this.prisma.user.findUnique({
      where: { commitment },
      select: { id: true },
    });

    if (!user) return null;

    const { start, end } = this.getWeekDateRange(week);

    // Get all users' points for this week, ordered by points desc
    const leaderboard = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      where: {
        earnedAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    // Find user's rank
    const userIndex = leaderboard.findIndex(
      (entry) => entry.userId === user.id,
    );

    if (userIndex === -1) return null;

    return userIndex + 1; // Rank is 1-indexed
  }

  /**
   * Get claimable weeks for a user
   */
  async getClaimableWeeks(commitment: string): Promise<ClaimableWeek[]> {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
      select: { id: true },
    });

    if (!user) return [];

    const completedWeeks = this.getCompletedWeeks();

    const claimableWeeks: ClaimableWeek[] = [];

    for (const week of completedWeeks) {
      // Check if already claimed
      const existingClaim = await this.prisma.claimHistory.findUnique({
        where: {
          userId_week: {
            userId: user.id,
            week,
          },
        },
      });

      // Get user rank for this week
      const rank = await this.getUserRankForWeek(commitment, week);

      // Skip if no rank or rank > 100
      if (!rank || rank > 100) continue;

      // If already claimed, use data from ClaimHistory
      if (existingClaim) {
        claimableWeeks.push({
          week,
          rank: existingClaim.rank,
          rewardUsd: existingClaim.rewardUsd,
          rewardZen: existingClaim.rewardZen,
          isClaimed: true,
          txHash: existingClaim.txHash,
        });
      } else {
        // Not claimed yet, calculate reward
        const zenPrice = await this.priceService.getZenPriceForWeek(week);
        const rewardUsd = calculateRewardUsd(rank);
        const rewardZen = zenPrice > 0 ? rewardUsd / zenPrice : 0;

        claimableWeeks.push({
          week,
          rank,
          rewardUsd,
          rewardZen,
          isClaimed: false,
        });
      }
    }

    return claimableWeeks;
  }
  /**
   * Get claim summary for a user
   */
  async getClaimSummary(commitment: string): Promise<ClaimSummary> {
    const weeks = await this.getClaimableWeeks(commitment);

    // Only count unclaimed weeks for totals
    const unclaimedWeeks = weeks.filter((w) => !w.isClaimed);

    const totalUsd = unclaimedWeeks.reduce((sum, w) => sum + w.rewardUsd, 0);
    const totalZen = unclaimedWeeks.reduce((sum, w) => sum + w.rewardZen, 0);

    // Get current ZEN price for display (not for calculation)
    const zenPrice = await this.priceService.getZenPrice();

    return {
      weeks,
      totalUsd,
      totalZen,
      zenPrice,
    };
  }

  /**
   * Convert USD to ZEN
   */
  async convertUsdToZen(usd: number, week: number): Promise<number> {
    const zenPrice = await this.priceService.getZenPriceForWeek(week);
    if (zenPrice <= 0) {
      this.logger.error('ZEN price is 0 or unavailable');
      return 0;
    }
    return usd / zenPrice;
  }

  /**
   * Get user by commitment
   */
  async getUserByCommitment(commitment: string) {
    return this.prisma.user.findUnique({
      where: { commitment },
    });
  }

  /**
   * Check if user has any unclaimed rewards
   */
  async hasUnclaimedRewards(commitment: string): Promise<boolean> {
    const summary = await this.getClaimSummary(commitment);
    return summary.totalUsd > 0;
  }
}
