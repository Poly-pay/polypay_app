import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '@/database/database.module';
import { AccountModule } from '@/account/account.module';

@Module({
  imports: [DatabaseModule, AccountModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
