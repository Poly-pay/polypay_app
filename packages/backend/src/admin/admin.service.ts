import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { TxType } from '@/generated/prisma/client';
import { AnalyticsReportDto } from './dto/analytics-report.dto';
import { EXPLORER_URLS } from '@/common/constants/campaign';
import { TxStatus, VoteType } from '@polypay/shared';

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
    this.explorerConfig =
      EXPLORER_URLS[network as keyof typeof EXPLORER_URLS] ||
      EXPLORER_URLS.mainnet;
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
      case 'CLAIM':
        return 'Horizen';
      case 'DENY':
        return '';
      default:
        return 'zkVerify';
    }
  }

  /**
   * Build commitment → walletAddress map from loginHistory (batch query)
   */
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

    // Build included tx types based on params
    const includedTxTypes: TxType[] = [TxType.TRANSFER, TxType.BATCH];
    if (dto?.includeSignerOps) {
      includedTxTypes.push(
        TxType.ADD_SIGNER,
        TxType.REMOVE_SIGNER,
        TxType.SET_THRESHOLD,
      );
    }

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

    // Batch load wallet addresses for account creators
    const creatorCommitments = accounts
      .map((a) => a.signers[0]?.user.commitment)
      .filter(Boolean);

    // 3. APPROVE votes (filtered by includedTxTypes)
    const approveVotes = await this.prisma.vote.findMany({
      where: {
        voteType: VoteType.APPROVE,
        transaction: { type: { in: includedTxTypes } },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { transaction: true },
      orderBy: { createdAt: 'asc' },
    });

    // 4. DENY votes
    const denyVotes = dto?.includeDeny
      ? await this.prisma.vote.findMany({
          where: {
            voteType: VoteType.DENY,
            transaction: { type: { in: includedTxTypes } },
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          include: { transaction: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // 5. EXECUTE records (filtered by includedTxTypes)
    const executedTxs = await this.prisma.transaction.findMany({
      where: {
        status: TxStatus.EXECUTED,
        type: { in: includedTxTypes },
        ...(hasDateFilter ? { executedAt: dateFilter } : {}),
      },
      orderBy: { executedAt: 'asc' },
    });

    // Batch load all commitment → walletAddress mappings in one query
    const allCommitments = [
      ...creatorCommitments,
      ...approveVotes.map((v) => v.voterCommitment),
      ...denyVotes.map((v) => v.voterCommitment),
      ...executedTxs.map((tx) => tx.createdBy),
    ];
    const addressMap = await this.buildCommitmentToAddressMap(allCommitments);

    // Process accounts
    for (const account of accounts) {
      const creator = account.signers[0];
      if (!creator) continue;

      records.push({
        timestamp: account.createdAt,
        action: 'CREATE_ACCOUNT',
        userAddress: addressMap.get(creator.user.commitment) || 'UNKNOWN',
        multisigWallet: account.address,
        txHash: account.address,
      });
    }

    // Process approve votes - group by txId to find first vote (proposer)
    const votesByTx: Record<number, typeof approveVotes> = {};
    for (const vote of approveVotes) {
      if (!votesByTx[vote.txId]) {
        votesByTx[vote.txId] = [];
      }
      votesByTx[vote.txId].push(vote);
    }

    for (const txId in votesByTx) {
      const votes = votesByTx[txId].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      for (let i = 0; i < votes.length; i++) {
        const vote = votes[i];
        const action =
          i === 0 ? this.mapTxTypeToAction(vote.transaction.type) : 'APPROVE';

        records.push({
          timestamp: vote.createdAt,
          action,
          userAddress: addressMap.get(vote.voterCommitment) || 'UNKNOWN',
          multisigWallet: vote.transaction.accountAddress,
          txHash: vote.zkVerifyTxHash || 'PENDING',
        });
      }
    }

    // Process deny votes
    for (const vote of denyVotes) {
      records.push({
        timestamp: vote.createdAt,
        action: 'DENY',
        userAddress: addressMap.get(vote.voterCommitment) || 'UNKNOWN',
        multisigWallet: vote.transaction.accountAddress,
        txHash: null,
      });
    }

    // Process claims
    if (dto?.includeClaim) {
      const claimHistories = await this.prisma.claimHistory.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'asc' },
      });

      for (const claim of claimHistories) {
        records.push({
          timestamp: claim.createdAt,
          action: 'CLAIM',
          userAddress: claim.toAddress,
          multisigWallet: null,
          txHash: claim.txHash || 'PENDING',
        });
      }
    }

    // Process executed transactions
    for (const tx of executedTxs) {
      records.push({
        timestamp: tx.executedAt || tx.updatedAt,
        action: 'EXECUTE',
        userAddress: addressMap.get(tx.createdBy) || 'UNKNOWN',
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
        } else if (record.action === 'CLAIM') {
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
