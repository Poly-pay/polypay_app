import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestCode, CAMPAIGN_START } from '@polypay/shared';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// TODO: Change this to your commitment for testing
const MY_COMMITMENT =
  '7777412979265397193925220040726445950599854595059203997869095364409346949110';

/**
 * Generate random commitment (76-77 digit number string)
 */
function generateCommitment(): string {
  let commitment = '';
  // First digit: 1-9 (avoid leading zero)
  commitment += Math.floor(Math.random() * 9 + 1).toString();
  // Remaining 75 digits: 0-9
  for (let i = 0; i < 75; i++) {
    commitment += Math.floor(Math.random() * 10).toString();
  }
  return commitment;
}

/**
 * Get date in specific week
 * @param week Week number (1-6)
 * @param dayOffset Day offset within the week (0-6)
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
 * Seed leaderboard test data
 */
async function seedLeaderboardData() {
  // Get quests
  const quests = await prisma.quest.findMany({
    where: {
      code: { in: [QuestCode.ACCOUNT_FIRST_TX, QuestCode.SUCCESSFUL_TX] },
    },
  });

  if (quests.length === 0) {
    console.log('⚠️ No quests found. Quests will be auto-seeded on app start.');
    return;
  }

  const questFirstTx = quests.find(
    (q) => q.code === QuestCode.ACCOUNT_FIRST_TX,
  )!;
  const questSuccessfulTx = quests.find(
    (q) => q.code === QuestCode.SUCCESSFUL_TX,
  )!;

  console.log(`📊 Found ${quests.length} quests`);

  // 1. Create YOUR user
  console.log('👤 Creating your user...');
  const myUser = await prisma.user.upsert({
    where: { commitment: MY_COMMITMENT },
    create: { commitment: MY_COMMITMENT },
    update: {},
  });

  // Delete existing point histories for your user (for re-seeding)
  await prisma.pointHistory.deleteMany({
    where: { userId: myUser.id },
  });

  // Week 1: 500 points (5 x 100 pts) -> rank ~5
  for (let i = 0; i < 5; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questFirstTx.id,
        points: questFirstTx.points,
        earnedAt: getDateInWeek(1, i),
      },
    });
  }

  // Week 2: 150 points (3 x 50 pts) -> rank ~35
  for (let i = 0; i < 3; i++) {
    await prisma.pointHistory.create({
      data: {
        userId: myUser.id,
        questId: questSuccessfulTx.id,
        points: questSuccessfulTx.points,
        earnedAt: getDateInWeek(2, i),
      },
    });
  }

  // Week 3: 0 points -> no reward
  console.log(
    '✅ Your user created with: Week1=500pts, Week2=150pts, Week3=0pts',
  );

  // 2. Create 120 random users
  console.log('👥 Creating 120 random users...');
  const TOTAL_USERS = 120;

  for (let i = 0; i < TOTAL_USERS; i++) {
    // Generate unique commitment
    let commitment: string;
    let isUnique = false;

    while (!isUnique) {
      commitment = generateCommitment();
      const existing = await prisma.user.findUnique({
        where: { commitment },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: { commitment: commitment! },
    });

    // Week 1: Distribute points to create ranking
    // First 10 users: 100-400 pts (above your 500 -> you rank ~5-10)
    // Rest: 50-400 pts
    if (i < 4) {
      // 4 users with more points than you (600-800) -> you rank ~5
      const numRecords = randomBetween(6, 8);
      for (let j = 0; j < numRecords; j++) {
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
      // Other users: 50-400 pts
      const numRecords = randomBetween(1, 4);
      for (let j = 0; j < numRecords; j++) {
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

    // Week 2: Distribute points
    // ~30 users with more points than you (150) -> you rank ~35
    if (i < 30) {
      const numRecords = randomBetween(4, 8);
      for (let j = 0; j < numRecords; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(2, randomBetween(0, 6)),
          },
        });
      }
    } else {
      const numRecords = randomBetween(0, 2);
      for (let j = 0; j < numRecords; j++) {
        await prisma.pointHistory.create({
          data: {
            userId: user.id,
            questId: questSuccessfulTx.id,
            points: questSuccessfulTx.points,
            earnedAt: getDateInWeek(2, randomBetween(0, 6)),
          },
        });
      }
    }

    // Week 3: Random points
    const week3Records = randomBetween(0, 3);
    for (let j = 0; j < week3Records; j++) {
      const quest = Math.random() > 0.5 ? questFirstTx : questSuccessfulTx;
      await prisma.pointHistory.create({
        data: {
          userId: user.id,
          questId: quest.id,
          points: quest.points,
          earnedAt: getDateInWeek(3, randomBetween(0, 6)),
        },
      });
    }

    // Log progress every 20 users
    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/${TOTAL_USERS} users...`);
    }
  }

  console.log(`✅ Seeded ${TOTAL_USERS} random users`);
}

async function main() {
  console.log('🌱 Starting seed...');
  console.log(`📅 Campaign start: ${CAMPAIGN_START.toISOString()}`);

  await seedLeaderboardData();

  console.log('🌱 Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
