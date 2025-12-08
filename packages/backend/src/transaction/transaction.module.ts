import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { ZkVerifyModule } from '@/zkverify/zkverify.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule, ZkVerifyModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}