import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { QuestCode, CAMPAIGN_START } from '@polypay/shared';

const MY_COMMITMENT =
  '12698637326243833291683285123744793736970399974462682610827690405933942697493';

const EXTRA_COMMITMENT =
  '7777412979265397193925220040726445950599854595059203997869095364409346949110';

const TOTAL_USERS = 120;

@Injectable()
export class LeaderboardSeederService implements OnModuleInit {
  private readonly logger = new Logger(LeaderboardSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedLeaderboardData();
  }

  /**
   * Generate random commitment (76-77 digit number string)
   */
  private generateCommitment(): string {
    let commitment = '';
    commitment += Math.floor(Math.random() * 9 + 1).toString();
    for (let i = 0; i < 75; i++) {
      commitment += Math.floor(Math.random() * 10).toString();
    }
    return commitment;
  }

  /**
   * Get date in specific week
   */
  private getDateInWeek(week: number, dayOffset: number = 0): Date {
    const date = new Date(CAMPAIGN_START);
    date.setDate(date.getDate() + (week - 1) * 7 + dayOffset);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  /**
   * Random number between min and max (inclusive)
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Clear leaderboard data
   */
  private async clearLeaderboardData() {
    this.logger.log('Clearing leaderboard data...');

    await this.prisma.pointHistory.deleteMany({});
    await this.prisma.claimHistory.deleteMany({});

    this.logger.log('Cleared PointHistory and ClaimHistory');
  }

  /**
   * Seed leaderboard test data
   *
   * Test cases covered:
   * - Week 1: Your rank 1 (10% reward - $70)
   * - Week 2: Your rank 5 (4% reward - $28)
   * - Week 3: Your rank 15 (2% reward - $14)
   * - Week 4: Your rank 35 (~0.83% reward - ~$5.83)
   * - Week 5: Current week (no claim)
   * - Week 6: Future week (disabled)
   */
  private async seedLeaderboardData() {
    this.logger.log('Starting leaderboard seed...');
    this.logger.log(`Campaign start: ${CAMPAIGN_START.toISOString()}`);

    // Clear existing data
    await this.clearLeaderboardData();

    // Get quests
    const quests = await this.prisma.quest.findMany({
      where: {
        code: { in: [QuestCode.ACCOUNT_FIRST_TX, QuestCode.SUCCESSFUL_TX] },
      },
    });

    if (quests.length === 0) {
      this.logger.warn('No quests found. Skipping leaderboard seed.');
      return;
    }

    const questFirstTx = quests.find(
      (q) => q.code === QuestCode.ACCOUNT_FIRST_TX,
    )!;
    const questSuccessfulTx = quests.find(
      (q) => q.code === QuestCode.SUCCESSFUL_TX,
    )!;

    // 1. Create MY_USER (main test user)
    this.logger.log('Creating main user...');
    const myUser = await this.prisma.user.upsert({
      where: { commitment: MY_COMMITMENT },
      create: { commitment: MY_COMMITMENT },
      update: {},
    });

    // Week 1: 1000 points -> rank 1 (highest)
    for (let i = 0; i < 10; i++) {
      await this.prisma.pointHistory.create({
        data: {
          userId: myUser.id,
          questId: questFirstTx.id,
          points: questFirstTx.points,
          earnedAt: this.getDateInWeek(1, i % 7),
        },
      });
    }

    // Week 2: 400 points -> rank 5
    for (let i = 0; i < 4; i++) {
      await this.prisma.pointHistory.create({
        data: {
          userId: myUser.id,
          questId: questFirstTx.id,
          points: questFirstTx.points,
          earnedAt: this.getDateInWeek(2, i),
        },
      });
    }

    // Week 3: 300 points -> rank 15
    for (let i = 0; i < 3; i++) {
      await this.prisma.pointHistory.create({
        data: {
          userId: myUser.id,
          questId: questFirstTx.id,
          points: questFirstTx.points,
          earnedAt: this.getDateInWeek(3, i),
        },
      });
    }

    // Week 4: 200 points -> rank 35
    for (let i = 0; i < 2; i++) {
      await this.prisma.pointHistory.create({
        data: {
          userId: myUser.id,
          questId: questFirstTx.id,
          points: questFirstTx.points,
          earnedAt: this.getDateInWeek(4, i),
        },
      });
    }

    this.logger.log(
      'Main user: Week1=1000pts(#1), Week2=400pts(#5), Week3=300pts(#15), Week4=200pts(#35)',
    );

    // 2. Create EXTRA_USER (additional test user for claim testing)
    this.logger.log('Creating extra user...');
    const extraUser = await this.prisma.user.upsert({
      where: { commitment: EXTRA_COMMITMENT },
      create: { commitment: EXTRA_COMMITMENT },
      update: {},
    });

    // Extra user: 500 points each week -> around rank 2-10
    for (let week = 1; week <= 4; week++) {
      for (let i = 0; i < 5; i++) {
        await this.prisma.pointHistory.create({
          data: {
            userId: extraUser.id,
            questId: questFirstTx.id,
            points: questFirstTx.points,
            earnedAt: this.getDateInWeek(week, i),
          },
        });
      }
    }

    this.logger.log('Extra user: 500pts each week (rank ~2-10)');

    // 3. Create 120 random users
    this.logger.log(`Creating ${TOTAL_USERS} random users...`);

    for (let i = 0; i < TOTAL_USERS; i++) {
      let commitment: string;
      let isUnique = false;

      while (!isUnique) {
        commitment = this.generateCommitment();
        const existing = await this.prisma.user.findUnique({
          where: { commitment },
        });
        if (!existing) isUnique = true;
      }

      const user = await this.prisma.user.create({
        data: { commitment: commitment! },
      });

      // Week 1: No one higher than 1000 points (main user rank 1)
      const week1Points = this.randomBetween(1, 9);
      for (let j = 0; j < week1Points; j++) {
        await this.prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questFirstTx.id,
            points: questFirstTx.points,
            earnedAt: this.getDateInWeek(1, this.randomBetween(0, 6)),
          },
        });
      }

      // Week 2: 4 users with 500+ points (main user 400 -> rank 5)
      if (i < 4) {
        const week2Points = this.randomBetween(5, 8);
        for (let j = 0; j < week2Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questFirstTx.id,
              points: questFirstTx.points,
              earnedAt: this.getDateInWeek(2, this.randomBetween(0, 6)),
            },
          });
        }
      } else {
        const week2Points = this.randomBetween(0, 3);
        for (let j = 0; j < week2Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questFirstTx.id,
              points: questFirstTx.points,
              earnedAt: this.getDateInWeek(2, this.randomBetween(0, 6)),
            },
          });
        }
      }

      // Week 3: 14 users with 400+ points (main user 300 -> rank 15)
      if (i < 14) {
        const week3Points = this.randomBetween(4, 7);
        for (let j = 0; j < week3Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questFirstTx.id,
              points: questFirstTx.points,
              earnedAt: this.getDateInWeek(3, this.randomBetween(0, 6)),
            },
          });
        }
      } else {
        const week3Points = this.randomBetween(0, 2);
        for (let j = 0; j < week3Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questFirstTx.id,
              points: questFirstTx.points,
              earnedAt: this.getDateInWeek(3, this.randomBetween(0, 6)),
            },
          });
        }
      }

      // Week 4: 34 users with 250+ points (main user 200 -> rank 35)
      if (i < 34) {
        const week4Points = this.randomBetween(3, 6);
        for (let j = 0; j < week4Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questSuccessfulTx.id,
              points: questSuccessfulTx.points,
              earnedAt: this.getDateInWeek(4, this.randomBetween(0, 6)),
            },
          });
        }
      } else {
        const week4Points = this.randomBetween(0, 2);
        for (let j = 0; j < week4Points; j++) {
          await this.prisma.pointHistory.create({
            data: {
              userId: user.id,
              questId: questSuccessfulTx.id,
              points: questSuccessfulTx.points,
              earnedAt: this.getDateInWeek(4, this.randomBetween(0, 6)),
            },
          });
        }
      }

      // Week 5: Random points (current week)
      const week5Points = this.randomBetween(0, 3);
      for (let j = 0; j < week5Points; j++) {
        await this.prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: this.getDateInWeek(5, this.randomBetween(0, 2)),
          },
        });
      }

      if ((i + 1) % 20 === 0) {
        this.logger.log(`Created ${i + 1}/${TOTAL_USERS} users...`);
      }
    }

    this.logger.log('');
    this.logger.log('=== Leaderboard Seed Completed ===');
    this.logger.log('Main user test cases:');
    this.logger.log('  Week 1: Rank #1  → 10% reward ($70)');
    this.logger.log('  Week 2: Rank #5  → 4% reward ($28)');
    this.logger.log('  Week 3: Rank #15 → 2% reward ($14)');
    this.logger.log('  Week 4: Rank #35 → ~0.83% reward (~$5.83)');
    this.logger.log('  Week 5: Current week → No claim');
    this.logger.log('  Week 6: Future week  → Disabled');
    this.logger.log('');
    this.logger.log('Extra user: 500pts each week (claimable)');
  }
}
