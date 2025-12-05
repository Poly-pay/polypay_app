import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { ProofJobModule } from './proof-job/proof-job.module';
import { ZkVerifyModule } from './zkverify/zkverify.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ProofJobModule,
    ZkVerifyModule,
    TransactionModule
  ],
})
export class AppModule {}
