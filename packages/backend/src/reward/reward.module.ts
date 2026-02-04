import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { PriceModule } from '@/price/price.module';
import { ZenTransferService } from './zen-transfer.service';
import { ClaimController } from './claim.controller';

@Module({
  imports: [PriceModule],
  controllers: [ClaimController],
  providers: [RewardService, ZenTransferService],
  exports: [RewardService, ZenTransferService],
})
export class RewardModule {}
