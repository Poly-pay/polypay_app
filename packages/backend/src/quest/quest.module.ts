import { Module } from '@nestjs/common';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestSeederService } from './quest-seeder.service';
import { LeaderboardSeederService } from './leaderboard-seeder.service';

@Module({
  imports: [QuestModule],
  controllers: [QuestController],
  providers: [QuestService, QuestSeederService, LeaderboardSeederService], // TODO: remove leaderboard seed service later
  exports: [QuestService],
})
export class QuestModule {}
