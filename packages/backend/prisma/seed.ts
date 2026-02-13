import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestCode, QuestCategory, CAMPAIGN_START } from '@polypay/shared';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// TODO: Change this to your commitment for testing
export const MY_COMMITMENT =
  '7777412979265397193925220040726445950599854595059203997869095364409346949110';

/**
 * Generate random commitment (76-77 digit number string)
 */
function generateCommitment(): string {
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
function getDateInWeek(week: number, dayOffset: number = 0): Date {
  const date = new Date(CAMPAIGN_START);
  date.setDate(date.getDate() + (week - 1) * 7 + dayOffset);
  date.setHours(12, 0, 0, 0);
  return date;
}

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Seed quests
 */
async function seedQuests() {
  console.log('🎯 Seeding quests...');

  const quests = [
    {
      code: QuestCode.ACCOUNT_FIRST_TX,
      name: 'Account creation',
      description:
        'Each account created and performed 1 successful transaction will receive 100 points link to the wallet addresses use for signin',
      points: 100,
      type: QuestCategory.RECURRING,
    },
    {
      code: QuestCode.SUCCESSFUL_TX,
      name: 'Transaction',
      description:
        'Each successful transaction by an account earns 50 points, credited to the address that initiates the transaction.',
      points: 50,
      type: QuestCategory.RECURRING,
    },
  ];

  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { code: quest.code },
      update: {
        name: quest.name,
        description: quest.description,
        points: quest.points,
        type: quest.type,
      },
      create: {
        code: quest.code,
        name: quest.name,
        description: quest.description,
        points: quest.points,
        type: quest.type,
        isActive: true,
      },
    });
  }

  console.log('✅ Seeded quests');
}

/**
 * Seed weekly ZEN prices for testing
 */
async function seedWeeklyZenPrices() {
  console.log('💰 Seeding weekly ZEN prices...');

  const prices = [
    { week: 1, price: 8.5 },
    { week: 2, price: 9.2 },
  ];

  for (const { week, price } of prices) {
    await prisma.weeklyZenPrice.upsert({
      where: { week },
      update: {
        price,
        capturedAt: getDateInWeek(week, 6),
      },
      create: {
        week,
        price,
        capturedAt: getDateInWeek(week, 6),
      },
    });
  }

  console.log('✅ Seeded weekly ZEN prices: Week1=$8.5, Week2=$9.2');
}

/**
 * Seed leaderboard test data
 *
 * Test cases covered:
 * - Week 1: Your rank 1 (10% reward = $70 / $8.5 = ~8.24 ZEN)
 * - Week 2: Your rank 5 (4% reward = $28 / $9.2 = ~3.04 ZEN)
 * - Week 3: Current week (timer counting, claim disabled)
 * - Week 4: Future week (disabled)
 */
async function seedLeaderboardData() {
  const quests = await prisma.quest.findMany({
    where: {
      code: { in: [QuestCode.ACCOUNT_FIRST_TX, QuestCode.SUCCESSFUL_TX] },
    },
  });

  if (quests.length === 0) {
    console.log('⚠️ No quests found.');
    return;
  }

  const questFirstTx = quests.find(
    (q) => q.code === QuestCode.ACCOUNT_FIRST_TX,
  )!;
  const questSuccessfulTx = quests.find(
    (q) => q.code === QuestCode.SUCCESSFUL_TX,
  )!;

  console.log('📊 Seeding leaderboard data...');
  console.log('📅 Campaign start:', CAMPAIGN_START.toISOString());

  // 1. Create YOUR user
  console.log('👤 Creating your user...');
  const myUser = await prisma.user.upsert({
    where: { commitment: MY_COMMITMENT },
    create: { commitment: MY_COMMITMENT },
    update: {},
  });

  // Delete existing point histories for your user
  await prisma.pointHistory.deleteMany({
    where: { userId: myUser.id },
  });

  // Week 1: 1000 points -> rank 1 (highest) - COMPLETED, can claim
  for (let i = 0; i < 10; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(1, i % 7),
      },
    });
  }

  // Week 2: 400 points -> rank 5 - COMPLETED, can claim
  for (let i = 0; i < 4; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(2, i),
      },
    });
  }

  // Week 3: 300 points - CURRENT WEEK, timer counting
  for (let i = 0; i < 3; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(3, i),
      },
    });
  }

  // Week 4: No points for myUser - FUTURE WEEK

  console.log(
    '✅ Your user: Week1=1000pts(#1), Week2=400pts(#5), Week3=300pts, Week4=0pts',
  );

  // 2. Create 120 random users with distributed points
  console.log('👥 Creating 120 random users...');
  const TOTAL_USERS = 120;

  for (let i = 0; i < TOTAL_USERS; i++) {
    let commitment: string;
    let isUnique = false;

    while (!isUnique) {
      commitment = generateCommitment();
      const existing = await prisma.user.findUnique({
        where: { commitment },
      });
      if (!existing) isUnique = true;
    }

    const user = await prisma.user.create({
      data: { commitment: commitment! },
    });

    // Week 1: No one higher than 1000 points (your rank 1)
    // Users get 100-900 points
    const week1Points = randomBetween(1, 9);
    for (let j = 0; j < week1Points; j++) {
      await prisma.pointHistory.create({
        data: {
          userId: user.id,
          questId: questFirstTx.id,
          points: questFirstTx.points,
          earnedAt: getDateInWeek(1, randomBetween(0, 6)),
        },
      });
    }

    // Week 2: 4 users with 500+ points (your 400 -> rank 5)
    if (i < 4) {
      const week2Points = randomBetween(5, 8);
      for (let j = 0; j < week2Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questFirstTx.id,
            points: questFirstTx.points,
            earnedAt: getDateInWeek(2, randomBetween(0, 6)),
          },
        });
      }
    } else {
      const week2Points = randomBetween(0, 3);
      for (let j = 0; j < week2Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questFirstTx.id,
            points: questFirstTx.points,
            earnedAt: getDateInWeek(2, randomBetween(0, 6)),
          },
        });
      }
    }

    // Week 3: Random points (current week)
    const week3Points = randomBetween(0, 5);
    for (let j = 0; j < week3Points; j++) {
      await prisma.pointHistory.create({
        data: {
          userId: user.id,
          questId: questSuccessfulTx.id,
          points: questSuccessfulTx.points,
          earnedAt: getDateInWeek(3, randomBetween(0, 2)),
        },
      });
    }

    // Week 4: No points (future week)

    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/${TOTAL_USERS} users...`);
    }
  }

  console.log(`✅ Seeded ${TOTAL_USERS} random users`);
}

async function main() {
  console.log('🌱 Starting seed...');
  console.log('');
  console.log('📅 Campaign: 2026-01-23 to 2026-02-20 (4 weeks)');
  console.log('📅 Today: 2026-02-12 → Week 3 is current');
  console.log('');
  console.log('📋 Test cases:');
  console.log(
    '   Week 1: Your rank #1  → 10% reward ($70 / $8.5 = ~8.24 ZEN) - CAN CLAIM',
  );
  console.log(
    '   Week 2: Your rank #5  → 4% reward ($28 / $9.2 = ~3.04 ZEN) - CAN CLAIM',
  );
  console.log('   Week 3: Current week  → Timer counting down, claim disabled');
  console.log('   Week 4: Future week   → Disabled');
  console.log('');

  await seedQuests();
  await seedWeeklyZenPrices();
  await seedLeaderboardData();

  console.log('');
  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
