import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '@/database/database.module';
import { AccountModule } from '@/account/account.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';

@Module({
  imports: [DatabaseModule, AccountModule, RelayerModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
