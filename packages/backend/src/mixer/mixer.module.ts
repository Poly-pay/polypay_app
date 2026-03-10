import { Module } from '@nestjs/common';
import { MixerController } from './mixer.controller';
import { MixerService } from './mixer.service';
import { MixerIndexerService } from './mixer.indexer';
import { ZkVerifyModule } from '@/zkverify/zkverify.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule, ZkVerifyModule, RelayerModule],
  controllers: [MixerController],
  providers: [MixerService, MixerIndexerService],
  exports: [MixerService],
})
export class MixerModule {}
