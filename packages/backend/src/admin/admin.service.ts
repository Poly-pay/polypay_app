import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { TxType } from '@/generated/prisma/client';
import { AnalyticsReportDto } from './dto/analytics-report.dto';

interface AnalyticsRecord {
  timestamp: Date;
  action: string;
  userAddress: string;
  multisigWallet: string | null;
  txHash: string | null;
}

@Injectable()
export class AdminService {
  private readonly explorerConfig: {
    ZKVERIFY_EXPLORER: string;
    HORIZEN_EXPLORER_ADDRESS: string;
    HORIZEN_EXPLORER_TX: string;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const network = this.configService.get<string>('NETWORK') || 'mainnet';

    const configs = {
      mainnet: {
        ZKVERIFY_EXPLORER: 'https://zkverify.subscan.io/tx',
        HORIZEN_EXPLORER_ADDRESS: 'https://horizen.calderaexplorer.xyz/address',
        HORIZEN_EXPLORER_TX: 'https://horizen.calderaexplorer.xyz/tx',
      },
      testnet: {
        ZKVERIFY_EXPLORER: 'https://zkverify-testnet.subscan.io/tx',
        HORIZEN_EXPLORER_ADDRESS:
          'https://horizen-testnet.explorer.caldera.xyz/address',
        HORIZEN_EXPLORER_TX:
          'https://horizen-testnet.explorer.caldera.xyz/tx',
      },
    };

    this.explorerConfig = configs[network] || configs.mainnet;
  }

  /**
   * Map TxType to Action name
   */
  private mapTxTypeToAction(txType: TxType): string {
    switch (txType) {
      case TxType.TRANSFER:
        return 'TRANSFER';
      case TxType.BATCH:
        return 'BATCH_TRANSFER';
      case TxType.ADD_SIGNER:
        return 'ADD_SIGNER';
      case TxType.REMOVE_SIGNER:
        return 'REMOVE_SIGNER';
      case TxType.SET_THRESHOLD:
        return 'UPDATE_THRESHOLD';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get blockchain based on action
   */
  private getBlockchain(action: string): string {
    switch (action) {
      case 'EXECUTE':
      case 'CREATE_ACCOUNT':
        return 'Horizen';
      case 'DENY':
        return '';
      default:
        return 'zkVerify';
    }
  }

  async generateAnalyticsReport(dto?: AnalyticsReportDto): Promise<string> {
    const records: AnalyticsRecord[] = [];

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dto?.startDate) {
      dateFilter.gte = new Date(dto.startDate + 'T00:00:00.000Z');
    }
    if (dto?.endDate) {
      dateFilter.lte = new Date(dto.endDate + 'T23:59:59.999Z');
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 1. LOGIN records
    if (dto?.includeLogin) {
      const loginRecords = await this.prisma.loginHistory.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'asc' },
      });

      for (const login of loginRecords) {
        records.push({
          timestamp: login.createdAt,
          action: 'LOGIN',
          userAddress: login.walletAddress,
          multisigWallet: null,
          txHash: login.zkVerifyTxHash || 'PENDING',
        });
      }
    }

    // 2. CREATE_ACCOUNT records
    const accounts = await this.prisma.account.findMany({
      where: hasDateFilter ? { createdAt: dateFilter } : undefined,
      include: {
        signers: {
          where: { isCreator: true },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const account of accounts) {
      const creator = account.signers[0];
      if (!creator) continue;

      // Get wallet address from LoginHistory
      const loginHistory = await this.prisma.loginHistory.findFirst({
        where: { commitment: creator.user.commitment },
        orderBy: { createdAt: 'desc' },
      });

      records.push({
        timestamp: account.createdAt,
        action: 'CREATE_ACCOUNT',
        userAddress: loginHistory?.walletAddress || 'UNKNOWN',
        multisigWallet: account.address,
        txHash: account.address,
      });
    }

    // 3. APPROVE votes (includes TRANSFER, BATCH_TRANSFER, ADD_SIGNER, etc.)
    const approveVotes = await this.prisma.vote.findMany({
      where: {
        voteType: 'APPROVE',
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { transaction: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group votes by txId to find first vote (proposer)
    const votesByTx: Record<number, typeof approveVotes> = {};
    for (const vote of approveVotes) {
      if (!votesByTx[vote.txId]) {
        votesByTx[vote.txId] = [];
      }
      votesByTx[vote.txId].push(vote);
    }

    // Sort each group by createdAt and determine action
    for (const txId in votesByTx) {
      const votes = votesByTx[txId].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      for (let i = 0; i < votes.length; i++) {
        const vote = votes[i];
        const isFirstVote = i === 0;

        // First vote = propose action (TRANSFER, ADD_SIGNER, etc.)
        // Subsequent votes = APPROVE
        const action = isFirstVote
          ? this.mapTxTypeToAction(vote.transaction.type)
          : 'APPROVE';

        const loginHistory = await this.prisma.loginHistory.findFirst({
          where: { commitment: vote.voterCommitment },
          orderBy: { createdAt: 'desc' },
        });

        records.push({
          timestamp: vote.createdAt,
          action: action,
          userAddress: loginHistory?.walletAddress || 'UNKNOWN',
          multisigWallet: vote.transaction.accountAddress,
          txHash: vote.zkVerifyTxHash || 'PENDING',
        });
      }
    }

    if (dto?.includeDeny) {
      const denyVotes = await this.prisma.vote.findMany({
        where: {
          voteType: 'DENY',
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        include: { transaction: true },
        orderBy: { createdAt: 'asc' },
      });

      for (const vote of denyVotes) {
        const loginHistory = await this.prisma.loginHistory.findFirst({
          where: { commitment: vote.voterCommitment },
          orderBy: { createdAt: 'desc' },
        });

        records.push({
          timestamp: vote.createdAt,
          action: 'DENY',
          userAddress: loginHistory?.walletAddress || 'UNKNOWN',
          multisigWallet: vote.transaction.accountAddress,
          txHash: null,
        });
      }
    }

    // 5. EXECUTE records
    const executedTxs = await this.prisma.transaction.findMany({
      where: {
        status: 'EXECUTED',
        ...(hasDateFilter ? { executedAt: dateFilter } : {}),
      },
      orderBy: { executedAt: 'asc' },
    });

    for (const tx of executedTxs) {
      const loginHistory = await this.prisma.loginHistory.findFirst({
        where: { commitment: tx.createdBy },
        orderBy: { createdAt: 'desc' },
      });

      records.push({
        timestamp: tx.executedAt || tx.updatedAt,
        action: 'EXECUTE',
        userAddress: loginHistory?.walletAddress || 'UNKNOWN',
        multisigWallet: tx.accountAddress,
        txHash: tx.txHash || 'PENDING',
      });
    }

    // Sort all records by timestamp
    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Generate CSV
    // Count totals by blockchain
    const totalZkVerify = records.filter(
      (r) => this.getBlockchain(r.action) === 'zkVerify',
    ).length;
    const totalHorizen = records.filter(
      (r) => this.getBlockchain(r.action) === 'Horizen',
    ).length;

    // Generate CSV
    return this.generateCSV(records, totalZkVerify, totalHorizen);
  }

  private generateCSV(
    records: AnalyticsRecord[],
    totalZkVerify: number,
    totalHorizen: number,
  ): string {
    const totalsHeader = [
      `Total zkVerify,${totalZkVerify}`,
      `Total Horizen,${totalHorizen}`,
      '', // empty line
    ];

    const header =
      'Timestamp,Blockchain,Action,User Address,Multisig Wallet,TX Hash';

    const rows = records.map((record) => {
      const timestamp = record.timestamp.toISOString();
      const action = record.action;
      const blockchain = this.getBlockchain(record.action);
      const userAddress = record.userAddress
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.userAddress}`
        : '';
      const multisigWallet = record.multisigWallet
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.multisigWallet}`
        : '';

      let txHash = '';
      if (record.txHash && record.txHash !== 'PENDING') {
        if (
          record.action === 'LOGIN' ||
          record.action === 'APPROVE' ||
          record.action === 'TRANSFER' ||
          record.action === 'BATCH_TRANSFER' ||
          record.action === 'ADD_SIGNER' ||
          record.action === 'REMOVE_SIGNER' ||
          record.action === 'UPDATE_THRESHOLD'
        ) {
          txHash = `${this.explorerConfig.ZKVERIFY_EXPLORER}/${record.txHash}`;
        } else if (record.action === 'CREATE_ACCOUNT') {
          txHash = `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.txHash}`;
        } else if (record.action === 'EXECUTE') {
          txHash = `${this.explorerConfig.HORIZEN_EXPLORER_TX}/${record.txHash}`;
        }
      } else if (record.txHash === 'PENDING') {
        txHash = 'PENDING';
      }

      return `"${timestamp}","${blockchain}","${action}","${userAddress}","${multisigWallet}","${txHash}"`;
    });

    return [...totalsHeader, header, ...rows].join('\n');
  }
}
