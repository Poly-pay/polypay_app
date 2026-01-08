import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from '@polypay/shared';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { EventsService } from '@/events/events.service';
import { ACCOUNT_CREATED_EVENT, AccountCreatedEventData } from '@polypay/shared';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private relayerService: RelayerService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create new multisig account with signers
   */
  async create(dto: CreateAccountDto, creatorCommitment: string) {
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
    const { address, txHash } = await this.relayerService.deployAccount(
      commitments,
      dto.threshold,
    );

    this.logger.log(`Account deployed at ${address}, txHash: ${txHash}`);

    // 4. Create account + users in transaction
    const account = await this.prisma.$transaction(async (prisma) => {
      // Upsert all users (update name only if null)
      const users = await Promise.all(
        dto.signers.map(async (signer) => {
          const existing = await prisma.user.findUnique({
            where: { commitment: signer.commitment },
          });

          if (existing) {
            // Update name only if current name is null
            if (!existing.name && signer.name) {
              return prisma.user.update({
                where: { commitment: signer.commitment },
                data: { name: signer.name },
              });
            }
            return existing;
          }

          // Create new user
          return prisma.user.create({
            data: {
              commitment: signer.commitment,
              name: signer.name,
            },
          });
        }),
      );

      // Create account
      const newAccount = await prisma.account.create({
        data: {
          address,
          name: dto.name,
          threshold: dto.threshold,
        },
      });

      // Create AccountSigner links
      await Promise.all(
        users.map((user) =>
          prisma.accountSigner.create({
            data: {
              userId: user.id,
              accountId: newAccount.id,
              isCreator: user.commitment === creatorCommitment,
            },
          }),
        ),
      );

      return prisma.account.findUniqueOrThrow({
        where: { id: newAccount.id },
        include: {
          signers: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    this.logger.log(`Created account in DB: ${account.address}`);

    const eventData: AccountCreatedEventData = {
      accountAddress: account.address,
      name: account.name,
      threshold: account.threshold,
      signerCount: account.signers.length,
      createdAt: account.createdAt.toISOString(),
    };

    // Filter out creator, only notify other signers
    const otherSigners = account.signers
      .map((as) => as.user.commitment)
      .filter((commitment) => commitment !== creatorCommitment);

    if (otherSigners.length > 0) {
      this.eventsService.emitToCommitments(
        otherSigners,
        ACCOUNT_CREATED_EVENT,
        eventData,
      );

      this.logger.log(
        `Emitted ${ACCOUNT_CREATED_EVENT} to ${otherSigners.length} other signers`,
      );
    }

    return this.findByAddress(address);
  }

  /**
   * Get multisig account by address with signers
   */
  async findByAddress(address: string) {
    const account = await this.prisma.account.findUnique({
      where: { address },
      include: {
        signers: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      id: account.id,
      address: account.address,
      name: account.name,
      threshold: account.threshold,
      createdAt: account.createdAt,
      signers: account.signers.map((as) => ({
        commitment: as.user.commitment,
        name: as.user.name,
        isCreator: as.isCreator,
      })),
    };
  }

  /**
   * Get all multisig accounts
   */
  async findAll() {
    const accounts = await this.prisma.account.findMany({
      include: {
        signers: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      address: account.address,
      name: account.name,
      threshold: account.threshold,
      createdAt: account.createdAt,
      signers: account.signers.map((as) => ({
        commitment: as.user.commitment,
        isCreator: as.isCreator,
      })),
    }));
  }

  /**
   * Update multisig account by address
   */
  async update(address: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findUnique({
      where: { address },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.account.update({
      where: { address },
      data: {
        name: dto.name,
      },
    });

    return this.findByAddress(address);
  }
}
