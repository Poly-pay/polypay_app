import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { QuestCode, TxStatus } from '@polypay/shared';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(private prisma: PrismaService) {}

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
   * Get leaderboard - top users by total points
   */
  async getLeaderboard(limit: number = 10) {
    const results = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit,
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
   * Get total points for a user
   */
  async getUserPoints(userId: string) {
    const result = await this.prisma.pointHistory.aggregate({
      where: { userId },
      _sum: { points: true },
    });

    const history = await this.prisma.pointHistory.findMany({
      where: { userId },
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
  async getUserRank(userId: string): Promise<number | null> {
    const allUsers = await this.prisma.pointHistory.groupBy({
      by: ['userId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    const index = allUsers.findIndex((u) => u.userId === userId);
    return index >= 0 ? index + 1 : null;
  }
}
