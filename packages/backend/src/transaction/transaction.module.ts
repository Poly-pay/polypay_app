import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { ZkVerifyModule } from '@/zkverify/zkverify.module';
import { DatabaseModule } from '@/database/database.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { BatchItemModule } from '@/batch-item/batch-item.module';
import { EventsModule } from '@/events/events.module';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';

@Module({
  imports: [
    DatabaseModule,
    ZkVerifyModule,
    RelayerModule,
    BatchItemModule,
    EventsModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, AnalyticsLoggerService],
  exports: [TransactionService],
})
export class TransactionModule {}
