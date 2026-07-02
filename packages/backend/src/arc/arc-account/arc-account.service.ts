import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { isAddress } from 'viem';
import { getChainType } from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { CreateArcAccountDto } from './dto/create-arc-account.dto';

@Injectable()
export class ArcAccountService {
  private readonly logger = new Logger(ArcAccountService.name);

  constructor(
    private readonly relayerService: RelayerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Deploy an Arc multisig and persist it. Unlike the ZK account flow, Arc
   * signers are plain ECDSA addresses (no commitments), so the Account is
   * tagged chainType "ecdsa" and signers/users key off address instead of
   * commitment.
   */
  async create(dto: CreateArcAccountDto) {
    const { owners, threshold, chainId, name } = dto;

    if (getChainType(chainId) !== 'ecdsa') {
      throw new BadRequestException(
        `chainId ${chainId} is not an Arc (ecdsa) chain`,
      );
    }

    if (!owners.every((owner) => isAddress(owner))) {
      throw new BadRequestException('All owners must be valid addresses');
    }

    if (threshold < 1 || threshold > owners.length) {
      throw new BadRequestException(
        'threshold must be between 1 and the number of owners',
      );
    }

    // Persist (and deploy) with lowercased addresses so DB lookups match the JWT
    // subject, which is lowercased. Solidity addresses are case-insensitive, so the
    // on-chain deploy is unaffected.
    const normalizedOwners = owners.map((owner) => owner.toLowerCase());

    const address = await this.relayerService.deployArcAccount(
      normalizedOwners,
      threshold,
      chainId,
    );

    this.logger.log(`Arc account deployed at ${address}`);

    const account = await this.prisma.$transaction(async (prisma) => {
      const users = await Promise.all(
        normalizedOwners.map((owner) =>
          prisma.user.upsert({
            where: { address: owner },
            update: {},
            create: { address: owner },
          }),
        ),
      );

      const newAccount = await prisma.account.create({
        data: {
          address,
          name: name?.trim() || 'Arc Multisig',
          threshold,
          chainId,
          chainType: 'ecdsa',
        },
      });

      await Promise.all(
        users.map((user, index) =>
          prisma.accountSigner.create({
            data: {
              userId: user.id,
              accountId: newAccount.id,
              address: normalizedOwners[index],
            },
          }),
        ),
      );

      return prisma.account.findUniqueOrThrow({
        where: { id: newAccount.id },
        include: {
          signers: {
            include: { user: true },
          },
        },
      });
    });

    this.logger.log(`Created Arc account in DB: ${account.address}`);

    return {
      id: account.id,
      address: account.address,
      threshold: account.threshold,
      chainId: account.chainId,
      chainType: account.chainType,
      signers: account.signers.map((signer) => signer.address),
    };
  }

  /**
   * List Arc accounts the given address is a signer on. Used by the
   * dashboard (Task 6+) via GET /arc/accounts for the logged-in address.
   */
  async findByOwner(address: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        chainType: 'ecdsa',
        signers: { some: { address: address.toLowerCase() } },
      },
      include: {
        signers: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      address: account.address,
      threshold: account.threshold,
      chainId: account.chainId,
      chainType: account.chainType,
      signers: account.signers.map((signer) => signer.address),
    }));
  }
}
