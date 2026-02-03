import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestCategory, QuestCode } from '@polypay/shared';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// Campaign start date (same as quest.service.ts)
// const CAMPAIGN_START = new Date('2026-01-06'); // Production
const CAMPAIGN_START = new Date(); // Testing - uses today

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
 * Generate random date within campaign period (6 weeks)
 */
function generateRandomEarnedAt(): Date {
  const maxDays = 42; // 6 weeks
  const randomDays = Math.floor(Math.random() * maxDays);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);

  const date = new Date(CAMPAIGN_START);
  date.setDate(date.getDate() + randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);

  return date;
}

async function seedQuests() {
  const quests = [
    {
      code: QuestCode.ACCOUNT_FIRST_TX,
      name: 'First Transaction',
      description: 'Create account and execute first transaction',
      points: 100,
      type: QuestCategory.RECURRING,
    },
    {
      code: QuestCode.SUCCESSFUL_TX,
      name: 'Successful Transaction',
      description: 'Execute a successful transaction',
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
      create: quest,
    });
  }

  console.log('✅ Seeded quests');
}

async function seedLeaderboardData() {
  // Get quests
  const quests = await prisma.quest.findMany({
    where: {
      code: {
        in: [QuestCode.ACCOUNT_FIRST_TX, QuestCode.SUCCESSFUL_TX],
      },
    },
  });

  if (quests.length === 0) {
    console.log('⚠️ No quests found. Run seedQuests first.');
    return;
  }

  console.log(`📊 Found ${quests.length} quests`);

  const TOTAL_USERS = 120;
  let createdUsers = 0;
  let createdPointHistories = 0;

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
      data: {
        commitment: commitment!,
      },
    });
    createdUsers++;

    // Random 1-5 point history records per user
    const numRecords = Math.floor(Math.random() * 5) + 1;

    for (let j = 0; j < numRecords; j++) {
      // Random quest
      const quest = quests[Math.floor(Math.random() * quests.length)];

      await prisma.pointHistory.create({
        data: {
          userId: user.id,
          questId: quest.id,
          points: quest.points,
          earnedAt: generateRandomEarnedAt(),
        },
      });
      createdPointHistories++;
    }

    // Log progress every 20 users
    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/${TOTAL_USERS} users...`);
    }
  }

  console.log(`✅ Seeded leaderboard data:`);
  console.log(`   - ${createdUsers} users`);
  console.log(`   - ${createdPointHistories} point histories`);
}

async function main() {
  console.log('🌱 Starting seed...');
  console.log(`📅 Campaign start: ${CAMPAIGN_START.toISOString()}`);

  await seedQuests();
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
