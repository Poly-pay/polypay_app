import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { ZkVerifyModule } from './zkverify/zkverify.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ZkVerifyModule,
    TransactionModule
  ],
})
export class AppModule {}
