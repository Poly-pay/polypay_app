import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { ArcAuthModule } from '../arc-auth/arc-auth.module';
import { ArcAccountController } from './arc-account.controller';
import { ArcAccountService } from './arc-account.service';

@Module({
  imports: [DatabaseModule, RelayerModule, ArcAuthModule],
  controllers: [ArcAccountController],
  providers: [ArcAccountService],
  exports: [ArcAccountService],
})
export class ArcAccountModule {}
