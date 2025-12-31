import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { ZkVerifyModule } from './zkverify/zkverify.module';
import { TransactionModule } from './transaction/transaction.module';
import { AccountModule } from './account/account.module';
import { WalletModule } from './wallet/wallet.module';
import { RelayerModule } from './relayer-wallet/relayer-wallet.module';
import { BatchItemModule } from './batch-item/batch-item.module';
import { AddressBookModule } from './address-book/address-book.module';
import { EventsModule } from './events/events.module';
import { NotificationModule } from './notification/notification.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ZkVerifyModule,
    TransactionModule,
    AccountModule,
    WalletModule,
    RelayerModule,
    BatchItemModule,
    AddressBookModule,
    EventsModule,
    NotificationModule,
    AuthModule
  ],
})
export class AppModule {}
