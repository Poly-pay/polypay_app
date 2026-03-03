import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  CreateAccountDto,
  CreateAccountBatchDto,
  UpdateAccountDto,
  CROSS_CHAIN_MIN_CONTRACT_VERSION,
} from '@polypay/shared';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { EventsService } from '@/events/events.service';
import {
  ACCOUNT_CREATED_EVENT,
  AccountCreatedEventData,
} from '@polypay/shared';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private relayerService: RelayerService,
    private readonly eventsService: EventsService,
    private readonly analyticsLogger: AnalyticsLoggerService,
  ) {}

  async create(
    dto: CreateAccountDto,
    creatorCommitment: string,
    userAddress?: string,
  ) {
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

    // 3. Deploy contract via relayer on specified chain
    const { address, txHash } = await this.relayerService.deployAccount(
      commitments,
      dto.threshold,
      dto.chainId,
    );

    this.logger.log(`Account deployed at ${address}, txHash: ${txHash}`);

    this.analyticsLogger.logCreateAccount(userAddress, address);

    const account = await this.prisma.$transaction(async (prisma) => {
      // Upsert all users (update name only if null)
      const users = await Promise.all(
        dto.signers.map(async (signer) => {
          const existing = await prisma.user.findUnique({
            where: { commitment: signer.commitment },
          });

          if (existing) {
            return existing;
          }

          // Create new user
          return prisma.user.create({
            data: {
              commitment: signer.commitment,
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
          chainId: dto.chainId,
          contractVersion: CROSS_CHAIN_MIN_CONTRACT_VERSION,
        },
      });

      // Create AccountSigner links
      await Promise.all(
        users.map((user) => {
          const signerDto = dto.signers.find(
            (s) => s.commitment === user.commitment,
          );
          return prisma.accountSigner.create({
            data: {
              userId: user.id,
              accountId: newAccount.id,
              isCreator: user.commitment === creatorCommitment,
              displayName: signerDto?.name || null,
            },
          });
        }),
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

  async createBatch(
    dto: CreateAccountBatchDto,
    creatorCommitment: string,
    userAddress?: string,
  ) {
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

    if (!dto.chainIds || dto.chainIds.length === 0) {
      throw new BadRequestException('At least one chainId is required');
    }

    const uniqueChainIds = Array.from(new Set(dto.chainIds));
    if (uniqueChainIds.length !== dto.chainIds.length) {
      throw new BadRequestException('Duplicate chainIds are not allowed');
    }

    // 3. Deploy contracts via relayer for all chains
    const deployments: { chainId: number; address: string; txHash: string }[] =
      [];

    for (const chainId of uniqueChainIds) {
      try {
        const { address, txHash } = await this.relayerService.deployAccount(
          commitments,
          dto.threshold,
          chainId,
        );

        this.logger.log(
          `Account deployed at ${address} on chain ${chainId}, txHash: ${txHash}`,
        );

        this.analyticsLogger.logCreateAccount(userAddress, address);

        deployments.push({ chainId, address, txHash });
      } catch (error) {
        this.logger.error(
          `Failed to deploy account on chain ${chainId}: ${error.message}`,
          (error as Error).stack,
        );
        throw new BadRequestException(
          'Failed to deploy account on one of the selected chains',
        );
      }
    }

    // 4. Persist all accounts and signers in a single transaction
    const createdAccounts = await this.prisma.$transaction(async (prisma) => {
      // Upsert all users (update name only if null)
      const users = await Promise.all(
        dto.signers.map(async (signer) => {
          const existing = await prisma.user.findUnique({
            where: { commitment: signer.commitment },
          });

          if (existing) {
            return existing;
          }

          return prisma.user.create({
            data: {
              commitment: signer.commitment,
            },
          });
        }),
      );

      const accounts = [];

      for (const deployment of deployments) {
        const newAccount = await prisma.account.create({
          data: {
            address: deployment.address,
            name: dto.name,
            threshold: dto.threshold,
            chainId: deployment.chainId,
            contractVersion: CROSS_CHAIN_MIN_CONTRACT_VERSION,
          },
        });

        await Promise.all(
          users.map((user) => {
            const signerDto = dto.signers.find(
              (s) => s.commitment === user.commitment,
            );
            return prisma.accountSigner.create({
              data: {
                userId: user.id,
                accountId: newAccount.id,
                isCreator: user.commitment === creatorCommitment,
                displayName: signerDto?.name || null,
              },
            });
          }),
        );

        const fullAccount = await prisma.account.findUniqueOrThrow({
          where: { id: newAccount.id },
          include: {
            signers: {
              include: {
                user: true,
              },
            },
          },
        });

        accounts.push(fullAccount);
      }

      return accounts;
    });

    // 5. Emit events for each account (excluding creator)
    for (const account of createdAccounts) {
      const eventData: AccountCreatedEventData = {
        accountAddress: account.address,
        name: account.name,
        threshold: account.threshold,
        signerCount: account.signers.length,
        createdAt: account.createdAt.toISOString(),
      };

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
          `Emitted ${ACCOUNT_CREATED_EVENT} to ${otherSigners.length} other signers for account ${account.address}`,
        );
      }
    }

    // Return normalized response objects (similar to findByAddress)
    return createdAccounts.map((account) => ({
      id: account.id,
      address: account.address,
      name: account.name,
      threshold: account.threshold,
      chainId: account.chainId,
      createdAt: account.createdAt,
      signers: account.signers.map((as) => ({
        commitment: as.user.commitment,
        name: as.displayName,
        isCreator: as.isCreator,
      })),
    }));
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
      chainId: account.chainId,
      contractVersion: account.contractVersion,
      createdAt: account.createdAt,
      signers: account.signers.map((as) => ({
        commitment: as.user.commitment,
        name: as.displayName,
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
      chainId: account.chainId,
      contractVersion: account.contractVersion,
      createdAt: account.createdAt,
      signers: account.signers.map((as) => ({
        commitment: as.user.commitment,
        name: as.displayName,
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
