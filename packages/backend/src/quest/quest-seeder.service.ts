import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { QuestCategory, QuestCode } from '@polypay/shared';

const QUEST_SEED_DATA = [
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

@Injectable()
export class QuestSeederService implements OnModuleInit {
  private readonly logger = new Logger(QuestSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedQuests();
  }

  private async seedQuests() {
    this.logger.log('Checking quest data...');

    for (const quest of QUEST_SEED_DATA) {
      await this.prisma.quest.upsert({
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

    this.logger.log(
      `Quest seeding completed. Total: ${QUEST_SEED_DATA.length} quests`,
    );
  }
}
