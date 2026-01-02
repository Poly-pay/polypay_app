import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  CreateWalletDto,
  UpdateWalletDto,
  WALLET_CREATED_EVENT,
  WalletCreatedEventData,
} from '@polypay/shared';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { EventsService } from '@/events/events.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private relayerService: RelayerService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create new wallet with signers
   */
  async create(dto: CreateWalletDto, creatorCommitment: string) {
    // 1. Validate creator is in commitments list
    if (!dto.commitments.includes(creatorCommitment)) {
      throw new BadRequestException('Creator must be in signers list');
    }

    // 2. Validate threshold
    if (dto.threshold > dto.commitments.length) {
      throw new BadRequestException(
        'Threshold cannot be greater than number of signers',
      );
    }

    // 3. Deploy contract via relayer
    const { address, txHash } = await this.relayerService.deployWallet(
      dto.commitments,
      dto.threshold,
    );

    this.logger.log(`Wallet deployed at ${address}, txHash: ${txHash}`);

    // 4. Create wallet + accounts in transaction
    const wallet = await this.prisma.$transaction(async (prisma) => {
      // Upsert all accounts
      const accounts = await Promise.all(
        dto.commitments.map((commitment) =>
          prisma.account.upsert({
            where: { commitment },
            create: { commitment },
            update: {},
          }),
        ),
      );

      // Create wallet
      const wallet = await prisma.wallet.create({
        data: {
          address,
          name: dto.name,
          threshold: dto.threshold,
        },
      });

      // Create AccountWallet links
      await Promise.all(
        accounts.map((account) =>
          prisma.accountWallet.create({
            data: {
              accountId: account.id,
              walletId: wallet.id,
              isCreator: account.commitment === creatorCommitment,
            },
          }),
        ),
      );

      return prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
        include: {
          accounts: {
            include: {
              account: true,
            },
          },
        },
      });
    });

    this.logger.log(`Created wallet in DB: ${wallet.address}`);

    const eventData: WalletCreatedEventData = {
      walletAddress: wallet.address,
      name: wallet.name,
      threshold: wallet.threshold,
      signerCount: wallet.accounts.length,
      createdAt: wallet.createdAt.toISOString(),
    };

    this.eventsService.emitToCommitments(
      wallet.accounts.map((aw) => aw.account.commitment),
      WALLET_CREATED_EVENT,
      eventData,
    );

    this.logger.log(
      `Emitted ${WALLET_CREATED_EVENT} to ${wallet.accounts.length} signers`,
    );

    return this.findByAddress(address);
  }

  /**
   * Get wallet by address with signers
   */
  async findByAddress(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      include: {
        accounts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      id: wallet.id,
      address: wallet.address,
      name: wallet.name,
      threshold: wallet.threshold,
      createdAt: wallet.createdAt,
      signers: wallet.accounts.map((aw) => ({
        commitment: aw.account.commitment,
        isCreator: aw.isCreator,
      })),
    };
  }

  /**
   * Get all wallets
   */
  async findAll() {
    const wallets = await this.prisma.wallet.findMany({
      include: {
        accounts: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      address: wallet.address,
      name: wallet.name,
      threshold: wallet.threshold,
      createdAt: wallet.createdAt,
      signers: wallet.accounts.map((aw) => ({
        commitment: aw.account.commitment,
        isCreator: aw.isCreator,
      })),
    }));
  }

  /**
   * Update wallet by address
   */
  async update(address: string, dto: UpdateWalletDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.prisma.wallet.update({
      where: { address },
      data: {
        name: dto.name,
      },
    });

    return this.findByAddress(address);
  }
}
