import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { RelayerModule } from '@/relayer-wallet/relayer-wallet.module';
import { ArcAuthModule } from '../arc-auth/arc-auth.module';
import { ArcTransactionController } from './arc-transaction.controller';
import { ArcTransactionService } from './arc-transaction.service';

@Module({
  imports: [DatabaseModule, RelayerModule, ArcAuthModule],
  controllers: [ArcTransactionController],
  providers: [ArcTransactionService],
  exports: [ArcTransactionService],
})
export class ArcTransactionModule {}
