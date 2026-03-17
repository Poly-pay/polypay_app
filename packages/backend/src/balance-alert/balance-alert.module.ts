import { Module } from '@nestjs/common';
import { BalanceAlertScheduler } from './balance-alert.scheduler';
import { TelegramService } from './telegram.service';

@Module({
  providers: [TelegramService, BalanceAlertScheduler],
  exports: [TelegramService],
})
export class BalanceAlertModule {}
