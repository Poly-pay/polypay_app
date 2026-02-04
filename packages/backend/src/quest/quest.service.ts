import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  QuestCode,
  TxStatus,
  PaginatedResponse,
  LeaderboardEntry,
  LeaderboardMeResponse,
  CAMPAIGN_START,
} from '@polypay/shared';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get week date range
   */
  private getWeekDateRange(week: number): { start: Date; end: Date } {
    const startDate = new Date(CAMPAIGN_START);
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(0, 0, 0, 0);

    return { start: startDate, end: endDate };
  }

  /**
   * Build date filter object
   */
  private buildDateFilter(filter: 'weekly' | 'all-time', week: number) {
    if (filter === 'weekly') {
      const { start, end } = this.getWeekDateRange(week);
      return {
        earnedAt: {
          gte: start,
          lt: end,
        },
      };
    }
    return {};
  }

  /**
   * Award points for first successful transaction of an account
   * Only creator (isCreator: true) receives points
   */
  async awardAccountFirstTx(
    accountAddress: string,
    currentTxId: number,
  ): Promise<void> {
    // Check if this is the first executed tx for this account
    const executedCount = await this.prisma.transaction.count({
      where: {
        accountAddress,
        status: TxStatus.EXECUTED,
        txId: { not: currentTxId },
      },
    });

    if (executedCount > 0) {
      // Not the first tx
      return;
    }

    // Get quest
    const quest = await this.prisma.quest.findUnique({
      where: { code: QuestCode.ACCOUNT_FIRST_TX },
    });

    if (!quest || !quest.isActive) {
      return;
    }

    // Get account and creator
    const account = await this.prisma.account.findUnique({
      where: { address: accountAddress },
      include: {
        signers: {
          where: { isCreator: true },
          include: { user: true },
        },
      },
    });

    if (!account || account.signers.length === 0) {
      return;
    }

    const creator = account.signers[0];

    // Check if already awarded for this account
    const existing = await this.prisma.pointHistory.findFirst({
      where: {
        questId: quest.id,
        userId: creator.userId,
        accountId: account.id,
      },
    });

    if (existing) {
      return;
    }

    // Award points
    await this.prisma.pointHistory.create({
      data: {
        userId: creator.userId,
        questId: quest.id,
        points: quest.points,
        accountId: account.id,
        txId: currentTxId,
      },
    });

    this.logger.log(
      `Awarded ${quest.points} points to user ${creator.userId} for ACCOUNT_FIRST_TX (account: ${accountAddress})`,
    );
  }

  /**
   * Award points for successful transaction to proposer
   */
  async awardSuccessfulTx(
    txId: number,
    proposerCommitment: string,
  ): Promise<void> {
    // Get quest
    const quest = await this.prisma.quest.findUnique({
      where: { code: QuestCode.SUCCESSFUL_TX },
    });

    if (!quest || !quest.isActive) {
      return;
    }

    // Get user by commitment
    const user = await this.prisma.user.findUnique({
      where: { commitment: proposerCommitment },
    });

    if (!user) {
      return;
    }

    // Award points
    await this.prisma.pointHistory.create({
      data: {
        userId: user.id,
        questId: quest.id,
        points: quest.points,
        txId,
      },
    });

    this.logger.log(
      `Awarded ${quest.points} points to user ${user.id} for SUCCESSFUL_TX (txId: ${txId})`,
    );
  }

  /**
   * Get all quests
   */
  async getQuests() {
    return this.prisma.quest.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get top 3 leaderboard entries
   */
  async getLeaderboardTop(
    filter: 'weekly' | 'all-time' = 'all-time',
    week: number = 1,
  ): Promise<LeaderboardEntry[]> {
    const dateFilter = this.buildDateFilter(filter, week);

    const results = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 3,
    });

    // Get user details
    const userIds = results.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, commitment: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      commitment: userMap.get(r.userId)?.commitment || null,
      totalPoints: r._sum.points || 0,
    }));
  }

  /**
   * Get current user's leaderboard position
   */
  async getLeaderboardMe(
    userId: string,
    commitment: string,
    filter: 'weekly' | 'all-time' = 'all-time',
    week: number = 1,
  ): Promise<LeaderboardMeResponse> {
    const dateFilter = this.buildDateFilter(filter, week);

    // Get user's total points
    const userPoints = await this.prisma.pointHistory.aggregate({
      where: { userId, ...dateFilter },
      _sum: { points: true },
    });

    const totalPoints = userPoints._sum.points || 0;

    // Get rank
    const rank = await this.getUserRank(userId, filter, week);

    return {
      rank,
      commitment,
      totalPoints,
    };
  }

  /**
   * Get paginated leaderboard
   */
  async getLeaderboard(
    limit: number = 20,
    filter: 'weekly' | 'all-time' = 'all-time',
    week: number = 1,
    cursor?: string,
  ): Promise<PaginatedResponse<LeaderboardEntry>> {
    const dateFilter = this.buildDateFilter(filter, week);

    // Get all aggregated points (sorted by points desc)
    const results = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    // Get user details
    const userIds = results.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, commitment: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build full leaderboard with ranks
    const fullLeaderboard: LeaderboardEntry[] = results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      commitment: userMap.get(r.userId)?.commitment || null,
      totalPoints: r._sum.points || 0,
    }));

    // Apply cursor-based pagination (cursor = rank number as string)
    let startIndex = 0;
    if (cursor) {
      const cursorRank = parseInt(cursor, 10);
      if (!isNaN(cursorRank) && cursorRank > 0) {
        startIndex = cursorRank; // rank is 1-indexed, so rank N means start from index N
      }
    }

    // Fetch limit + 1 to check if there are more items
    const paginatedData = fullLeaderboard.slice(
      startIndex,
      startIndex + limit + 1,
    );
    const hasMore = paginatedData.length > limit;
    const data = hasMore ? paginatedData.slice(0, limit) : paginatedData;

    // Next cursor is the last item's rank
    const nextCursor =
      hasMore && data.length > 0 ? String(data[data.length - 1].rank) : null;

    return { data, nextCursor, hasMore };
  }

  /**
   * Get total points for a user
   */
  async getUserPoints(
    userId: string,
    filter: 'weekly' | 'all-time' = 'all-time',
    week: number = 1,
  ) {
    const dateFilter = this.buildDateFilter(filter, week);

    const result = await this.prisma.pointHistory.aggregate({
      where: { userId, ...dateFilter },
      _sum: { points: true },
    });

    const history = await this.prisma.pointHistory.findMany({
      where: { userId, ...dateFilter },
      include: { quest: true },
      orderBy: { earnedAt: 'desc' },
    });

    return {
      totalPoints: result._sum.points || 0,
      history,
    };
  }

  /**
   * Get user rank in leaderboard
   */
  async getUserRank(
    userId: string,
    filter: 'weekly' | 'all-time' = 'all-time',
    week: number = 1,
  ): Promise<number | null> {
    const dateFilter = this.buildDateFilter(filter, week);

    const allUsers = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    const index = allUsers.findIndex((u) => u.userId === userId);
    return index >= 0 ? index + 1 : null;
  }
}
