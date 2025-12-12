import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { ZkVerifyModule } from '@/zkverify/zkverify.module';
import { DatabaseModule } from '@/database/database.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { BatchItemModule } from '@/batch-item/batch-item.module';

@Module({
  imports: [DatabaseModule, ZkVerifyModule, RelayerModule, BatchItemModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}