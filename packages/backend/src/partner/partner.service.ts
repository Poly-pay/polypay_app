import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AccountReportDto } from './dto/account-report.dto';
import { getChainById } from '@polypay/shared';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAccountReport(dto: AccountReportDto): Promise<string> {
    const where: Record<string, unknown> = {};

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
      select: { address: true, createdAt: true, chainId: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.generateCSV(accounts, dto.includeChainId);
  }

  private getExplorerAddressUrl(chainId: number, address: string): string {
    try {
      const chain = getChainById(chainId);
      return `${chain.blockExplorers!.default.url}/address/${address}`;
    } catch {
      return address;
    }
  }

  private generateCSV(
    accounts: { address: string; createdAt: Date; chainId: number }[],
    includeChainId?: boolean,
  ): string {
    const totalLine = [`Total Accounts,${accounts.length}`, ''];

    const header = includeChainId
      ? 'address,created_at,chain_id,chain_name'
      : 'address,created_at';

    const rows = accounts.map((account) => {
      const addressLink = this.getExplorerAddressUrl(
        account.chainId,
        account.address,
      );
      const base = `${addressLink},${account.createdAt.toISOString()}`;
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
