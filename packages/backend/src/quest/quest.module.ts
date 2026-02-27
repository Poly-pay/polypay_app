import { Module } from '@nestjs/common';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestSeederService } from './quest-seeder.service';
import { AccountChainIdMigrationService } from './update-chain.service';

@Module({
  imports: [QuestModule],
  controllers: [QuestController],
  providers: [QuestService, QuestSeederService],
  exports: [QuestService],
})
export class QuestModule {}
