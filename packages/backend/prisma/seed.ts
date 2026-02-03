import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestCategory, QuestCode } from '@polypay/shared';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function seedQuests() {
  const quests = [
    {
      code: QuestCode.ACCOUNT_FIRST_TX,
      name: 'First Transaction',
      description: 'Create account and execute first transaction', // TODO: change description
      points: 100,
      type: QuestCategory.RECURRING,
    },
    {
      code: QuestCode.SUCCESSFUL_TX,
      name: 'Successful Transaction',
      description: 'Execute a successful transaction', // TODO: change description
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

async function main() {
  console.log('🌱 Starting seed...');
  await seedQuests();
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
