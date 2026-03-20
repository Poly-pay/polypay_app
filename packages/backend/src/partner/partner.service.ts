import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AccountReportDto } from './dto/account-report.dto';
import { getChainById } from '@polypay/shared';

const BASE_CHAIN_IDS = [8453, 84532];

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAccountReport(dto: AccountReportDto): Promise<string> {
    const where: Record<string, unknown> = {
      chainId: { notIn: BASE_CHAIN_IDS },
    };

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(
          dto.startDate,
        );
      }
      if (dto.endDate) {
        const end = new Date(dto.endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = end;
      }
    }

    const accounts = await this.prisma.account.findMany({
      where,
      include: {
        signers: {
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get creator (or first signer as fallback) commitment for each account
    const commitments = accounts
      .map((a) => {
        const creator = a.signers.find((s) => s.isCreator);
        return (creator || a.signers[0])?.user.commitment;
      })
      .filter((c): c is string => !!c);
    const addressMap = await this.buildCommitmentToAddressMap(commitments);

    return this.generateCSV(accounts, addressMap, dto.includeChainId);
  }

  private async buildCommitmentToAddressMap(
    commitments: string[],
  ): Promise<Map<string, string>> {
    if (commitments.length === 0) return new Map();

    const uniqueCommitments = [...new Set(commitments)];
    const loginHistories = await this.prisma.loginHistory.findMany({
      where: { commitment: { in: uniqueCommitments } },
      orderBy: { createdAt: 'desc' },
      distinct: ['commitment'],
    });

    return new Map(
      loginHistories.map((lh) => [lh.commitment, lh.walletAddress]),
    );
  }

  private generateCSV(
    accounts: {
      address: string;
      createdAt: Date;
      chainId: number;
      signers: {
        isCreator: boolean;
        user: { commitment: string };
      }[];
    }[],
    addressMap: Map<string, string>,
    includeChainId?: boolean,
  ): string {
    const totalLine = [`Total Accounts,${accounts.length}`, ''];

    const header = includeChainId
      ? 'Multisig Account Address,EOA,Created At,Chain ID,Chain Name'
      : 'Multisig Account Address,EOA,Created At';

    const rows = accounts.map((account) => {
      const creator = account.signers.find((s) => s.isCreator);
      const commitment = (creator || account.signers[0])?.user.commitment;
      const eoaWallet = commitment
        ? addressMap.get(commitment) || 'UNKNOWN'
        : 'UNKNOWN';
      const base = `${account.address},${eoaWallet},${account.createdAt.toISOString()}`;
      if (includeChainId) {
        let chainName: string;
        try {
          chainName = getChainById(account.chainId).name;
        } catch {
          chainName = `Unknown (${account.chainId})`;
        }
        return `${base},${account.chainId},${chainName}`;
      }
      return base;
    });

    return [...totalLine, header, ...rows].join('\n');
  }
}
