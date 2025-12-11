import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { ZkVerifyModule } from './zkverify/zkverify.module';
import { TransactionModule } from './transaction/transaction.module';
import { AccountModule } from './account/account.module';
import { WalletModule } from './wallet/wallet.module';
import { RelayerModule } from './relayer-wallet/relayer-wallet.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ZkVerifyModule,
    TransactionModule,
    AccountModule,
    WalletModule,
    RelayerModule
  ],
})
export class AppModule {}
