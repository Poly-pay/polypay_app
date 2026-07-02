import { Module } from '@nestjs/common';
import { ArcAuthModule } from './arc-auth/arc-auth.module';
import { ArcAccountModule } from './arc-account/arc-account.module';
import { ArcTransactionModule } from './arc-transaction/arc-transaction.module';

// Aggregates the Arc (Circle Arc / ECDSA multisig) feature modules so
// app.module.ts only needs a single import.
@Module({
  imports: [ArcAuthModule, ArcAccountModule, ArcTransactionModule],
})
export class ArcModule {}
