import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { IpRestrictMiddleware } from '@/common/middleware/ip-restrict.middleware';
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
import { QuestModule } from './quest/quest.module';
import { RewardModule } from './reward/reward.module';
import { ScheduleModule } from '@nestjs/schedule';

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
    QuestModule,
    RewardModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpRestrictMiddleware).forRoutes('*');
  }
}
