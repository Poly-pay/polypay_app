import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestCode, QuestCategory, CAMPAIGN_START } from '@polypay/shared';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const MY_COMMITMENT =
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
 * Seed edge case test data
 * 
 * Test cases covered:
 * - Week 1: Your rank 2 (7% reward)
 * - Week 2: Your rank 3 (5% reward)
 * - Week 3: Your rank 100 (0.3% reward - boundary có reward)
 * - Week 4: Your rank 101 (0% reward - boundary không reward)
 * - Week 5: Current week (no claim)
 * - Week 6: Future week (disabled)
 */
async function seedEdgeCaseData() {
  const quests = await prisma.quest.findMany({
    where: {
      code: { in: [QuestCode.ACCOUNT_FIRST_TX, QuestCode.SUCCESSFUL_TX] },
    },
  });

  if (quests.length === 0) {
    console.log('⚠️ No quests found.');
    return;
  }

  const questFirstTx = quests.find((q) => q.code === QuestCode.ACCOUNT_FIRST_TX)!;
  const questSuccessfulTx = quests.find((q) => q.code === QuestCode.SUCCESSFUL_TX)!;

  console.log('📊 Seeding edge case data...');
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

  // Week 1: 900 points -> rank 2
  for (let i = 0; i < 9; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(1, i % 7),
      },
    });
  }

  // Week 2: 800 points -> rank 3
  for (let i = 0; i < 8; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(2, i % 7),
      },
    });
  }

  // Week 3: 100 points -> rank 100
  await prisma.pointHistory.create({
    data: {
      userId: myUser.id,
      questId: questFirstTx.id,
      points: questFirstTx.points,
      earnedAt: getDateInWeek(3, 0),
    },
  });

  // Week 4: 50 points -> rank 101 (no reward)
  await prisma.pointHistory.create({
    data: {
      userId: myUser.id,
      questId: questSuccessfulTx.id,
      points: questSuccessfulTx.points,
      earnedAt: getDateInWeek(4, 0),
    },
  });

  // Week 5 & 6: No points

  console.log('✅ Your user: Week1=900pts(#2), Week2=800pts(#3), Week3=100pts(#100), Week4=50pts(#101)');

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

    // Week 1: 1 user with 1000 points (rank 1), your 900 -> rank 2
    if (i === 0) {
      for (let j = 0; j < 10; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questFirstTx.id,
            points: questFirstTx.points,
            earnedAt: getDateInWeek(1, randomBetween(0, 6)),
          },
        });
      }
    } else {
      // Others get 100-800 points
      const week1Points = randomBetween(1, 8);
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
    }

    // Week 2: 2 users with 900+ points (rank 1-2), your 800 -> rank 3
    if (i < 2) {
      const week2Points = randomBetween(9, 12);
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
      const week2Points = randomBetween(0, 7);
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

    // Week 3: 99 users with 150+ points (your 100 -> rank 100)
    if (i < 99) {
      const week3Points = randomBetween(2, 5);
      for (let j = 0; j < week3Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(3, randomBetween(0, 6)),
          },
        });
      }
    } else {
      // Remaining 21 users get 0-50 points (below your 100)
      const week3Points = randomBetween(0, 1);
      for (let j = 0; j < week3Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(3, randomBetween(0, 6)),
          },
        });
      }
    }

    // Week 4: 100 users with 100+ points (your 50 -> rank 101)
    if (i < 100) {
      const week4Points = randomBetween(2, 5);
      for (let j = 0; j < week4Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(4, randomBetween(0, 6)),
          },
        });
      }
    } else {
      // Remaining 20 users get 0-50 points (same or below your 50)
      const week4Points = randomBetween(0, 1);
      for (let j = 0; j < week4Points; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(4, randomBetween(0, 6)),
          },
        });
      }
    }

    // Week 5: Random points (current week)
    const week5Points = randomBetween(0, 3);
    for (let j = 0; j < week5Points; j++) {
      await prisma.pointHistory.create({
        data: {
          userId: user.id,
          questId: questSuccessfulTx.id,
          points: questSuccessfulTx.points,
          earnedAt: getDateInWeek(5, randomBetween(0, 2)),
        },
      });
    }

    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/${TOTAL_USERS} users...`);
    }
  }

  console.log(`✅ Seeded ${TOTAL_USERS} random users`);
}

async function main() {
  console.log('🌱 Starting edge case seed...');
  console.log('');
  console.log('📋 Test cases:');
  console.log('   Week 1: Your rank #2   → 7% reward ($49)');
  console.log('   Week 2: Your rank #3   → 5% reward ($35)');
  console.log('   Week 3: Your rank #100 → 0.3% reward ($2.1) - boundary');
  console.log('   Week 4: Your rank #101 → NO reward - boundary');
  console.log('   Week 5: Current week   → No claim');
  console.log('   Week 6: Future week    → Disabled');
  console.log('');

  await seedQuests();
  await seedEdgeCaseData();

  console.log('');
  console.log('🌱 Edge case seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
