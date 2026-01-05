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
    // 1. Validate creator is in signers list
    const commitments = dto.signers.map((s) => s.commitment);
    if (!commitments.includes(creatorCommitment)) {
      throw new BadRequestException('Creator must be in signers list');
    }

    // 2. Validate threshold
    if (dto.threshold > dto.signers.length) {
      throw new BadRequestException(
        'Threshold cannot be greater than number of signers',
      );
    }
    // 3. Deploy contract via relayer
    const { address, txHash } = await this.relayerService.deployWallet(
      commitments,
      dto.threshold,
    );

    this.logger.log(`Wallet deployed at ${address}, txHash: ${txHash}`);

    // 4. Create wallet + accounts in transaction
    const wallet = await this.prisma.$transaction(async (prisma) => {
      // Upsert all accounts (update name only if null)
      const accounts = await Promise.all(
        dto.signers.map(async (signer) => {
          const existing = await prisma.account.findUnique({
            where: { commitment: signer.commitment },
          });

          if (existing) {
            // Update name only if current name is null
            if (!existing.name && signer.name) {
              return prisma.account.update({
                where: { commitment: signer.commitment },
                data: { name: signer.name },
              });
            }
            return existing;
          }

          // Create new account
          return prisma.account.create({
            data: {
              commitment: signer.commitment,
              name: signer.name,
            },
          });
        }),
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

    // Filter out creator, only notify other signers
    const otherSigners = wallet.accounts
      .map((aw) => aw.account.commitment)
      .filter((commitment) => commitment !== creatorCommitment);

    if (otherSigners.length > 0) {
      this.eventsService.emitToCommitments(
        otherSigners,
        WALLET_CREATED_EVENT,
        eventData,
      );

      this.logger.log(
        `Emitted ${WALLET_CREATED_EVENT} to ${otherSigners.length} other signers`,
      );
    }
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
        name: aw.account.name,
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
