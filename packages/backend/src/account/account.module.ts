import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { DatabaseModule } from '@/database/database.module';
import { UserModule } from '@/user/user.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { EventsModule } from '@/events/events.module';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';

@Module({
  imports: [DatabaseModule, UserModule, RelayerModule, EventsModule],
  controllers: [AccountController],
  providers: [AccountService, AnalyticsLoggerService],
  exports: [AccountService],
})
export class AccountModule {}
