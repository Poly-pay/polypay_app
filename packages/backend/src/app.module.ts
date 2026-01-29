import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { ZkVerifyModule } from './zkverify/zkverify.module';
import { TransactionModule } from './transaction/transaction.module';
import { UserModule } from './user/user.module';
import { AccountModule } from './account/account.module';
import { RelayerModule } from './relayer-wallet/relayer-wallet.module';
import { BatchItemModule } from './batch-item/batch-item.module';
import { ContactBookModule } from './contact-book/contact-book.module';
import { EventsModule } from './events/events.module';
import { NotificationModule } from './notification/notification.module';
import { AuthModule } from './auth/auth.module';
import { PriceModule } from './price/price.module';
import { FeatureRequestModule } from './feature-request/feature-request.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ZkVerifyModule,
    TransactionModule,
    UserModule,
    AccountModule,
    RelayerModule,
    BatchItemModule,
    ContactBookModule,
    EventsModule,
    NotificationModule,
    AuthModule,
    PriceModule,
    FeatureRequestModule,
    AdminModule,
  ],
})
export class AppModule {}
