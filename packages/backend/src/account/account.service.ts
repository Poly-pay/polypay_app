import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new account
   */
  async create(dto: CreateAccountDto) {
    // Check if account already exists
    const existing = await this.prisma.account.findUnique({
      where: { commitment: dto.commitment },
    });

    if (existing) {
      throw new ConflictException('Account already exists');
    }

    const account = await this.prisma.account.create({
      data: { commitment: dto.commitment },
    });

    this.logger.log(`Created account: ${account.id}`);
    return account;
  }

  /**
   * Get account by commitment
   */
  async findByCommitment(commitment: string) {
    const account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Get wallets for account
   */
  async getWallets(commitment: string) {
    const account = await this.prisma.account.findUnique({
      where: { commitment },
      include: {
        wallets: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!account) {
      // Return empty array if account doesn't exist yet
      return [];
    }

    return account.wallets.map((aw) => ({
      ...aw.wallet,
      isCreator: aw.isCreator,
    }));
  }

  /**
   * Upsert account (create if not exists)
   */
  async upsert(commitment: string) {
    return this.prisma.account.upsert({
      where: { commitment },
      create: { commitment },
      update: {},
    });
  }
}
