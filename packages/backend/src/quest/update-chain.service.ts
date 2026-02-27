import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

const HORIZEN_TESTNET_CHAIN_ID = 2651420;
const HORIZEN_MAINNET_CHAIN_ID = 26514;

@Injectable()
export class AccountChainIdMigrationService implements OnModuleInit {
  private readonly logger = new Logger(AccountChainIdMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.migrateChainIds();
  }

  private async migrateChainIds() {
    const result = await this.prisma.account.updateMany({
      where: { chainId: HORIZEN_MAINNET_CHAIN_ID },
      data: { chainId: HORIZEN_TESTNET_CHAIN_ID },
    });

    this.logger.log(
      `Account chainId migration completed. Updated ${result.count} accounts from ${HORIZEN_MAINNET_CHAIN_ID} to ${HORIZEN_TESTNET_CHAIN_ID}`,
    );
  }
}
