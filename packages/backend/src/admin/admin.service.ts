import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { TxType } from '@/generated/prisma/client';
import { AnalyticsReportDto } from './dto/analytics-report.dto';
import { EXPLORER_URLS } from '@/common/constants/campaign';
import { TxStatus, VoteType } from '@polypay/shared';

const BASE_CHAIN_IDS = [8453, 84532];

interface AnalyticsRecord {
  timestamp: Date;
  action: string;
  userAddress: string;
  multisigWallet: string | null;
  txHash: string | null;
  chainId?: number | null;
}

@Injectable()
export class AdminService {
  private readonly explorerConfig: {
    ZKVERIFY_EXPLORER: string;
    HORIZEN_EXPLORER_ADDRESS: string;
    HORIZEN_EXPLORER_TX: string;
    BASE_EXPLORER_ADDRESS: string;
    BASE_EXPLORER_TX: string;
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

  private mapTxTypeSuffix(txType: TxType): string {
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

  private mapTxTypeToAction(txType: TxType): string {
    return `PROPOSE_${this.mapTxTypeSuffix(txType)}`;
  }

  private mapTxTypeToApproveAction(txType: TxType): string {
    return `APPROVE_${this.mapTxTypeSuffix(txType)}`;
  }

  private mapTxTypeToDenyAction(txType: TxType): string {
    return `DENY_${this.mapTxTypeSuffix(txType)}`;
  }

  private mapTxTypeToExecuteAction(txType: TxType): string {
    return `EXECUTE_${this.mapTxTypeSuffix(txType)}`;
  }

  private getBlockchain(action: string, chainId?: number | null): string {
    if (
      action.startsWith('PROPOSE_') ||
      action.startsWith('APPROVE_') ||
      action === 'LOGIN'
    ) {
      return 'zkVerify';
    }

    if (action.startsWith('DENY_')) {
      return '';
    }

    if (action === 'CLAIM') {
      return 'Horizen';
    }

    // EXECUTE_* and CREATE_ACCOUNT: determine from chainId
    if (chainId === 8453 || chainId === 84532) {
      return 'Base';
    }
    if (chainId === 2651420 || chainId === 26514) {
      return 'Horizen';
    }

    return 'Horizen';
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

    // Base chain filter
    const excludeBaseFilter = !dto?.includeBase
      ? { chainId: { notIn: BASE_CHAIN_IDS } }
      : {};
    const excludeBaseAccountFilter = !dto?.includeBase
      ? { account: { chainId: { notIn: BASE_CHAIN_IDS } } }
      : {};

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
    const accounts = dto?.includeCreateAccount
      ? await this.prisma.account.findMany({
          where: {
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            ...excludeBaseFilter,
          },
          include: {
            signers: {
              where: { isCreator: true },
              include: { user: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // Batch load wallet addresses for account creators
    const creatorCommitments = accounts
      .map((a) => a.signers[0]?.user.commitment)
      .filter(Boolean);

    // 3. APPROVE votes (filtered by includedTxTypes)
    const approveVotes = await this.prisma.vote.findMany({
      where: {
        voteType: VoteType.APPROVE,
        transaction: {
          type: { in: includedTxTypes },
          ...excludeBaseAccountFilter,
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { transaction: { include: { account: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // 4. DENY votes
    const denyVotes = dto?.includeDeny
      ? await this.prisma.vote.findMany({
          where: {
            voteType: VoteType.DENY,
            transaction: {
              type: { in: includedTxTypes },
              ...excludeBaseAccountFilter,
            },
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
          include: { transaction: { include: { account: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // 5. EXECUTE records (filtered by includedTxTypes)
    const executedTxs = await this.prisma.transaction.findMany({
      where: {
        status: TxStatus.EXECUTED,
        type: { in: includedTxTypes },
        ...excludeBaseAccountFilter,
        ...(hasDateFilter ? { executedAt: dateFilter } : {}),
      },
      include: { account: true },
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
        chainId: account.chainId,
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
          i === 0
            ? this.mapTxTypeToAction(vote.transaction.type)
            : this.mapTxTypeToApproveAction(vote.transaction.type);

        records.push({
          timestamp: vote.createdAt,
          action,
          userAddress: addressMap.get(vote.voterCommitment) || 'UNKNOWN',
          multisigWallet: vote.transaction.accountAddress,
          txHash: vote.zkVerifyTxHash || 'PENDING',
          chainId: vote.transaction.account.chainId,
        });
      }
    }

    // Process deny votes
    for (const vote of denyVotes) {
      records.push({
        timestamp: vote.createdAt,
        action: this.mapTxTypeToDenyAction(vote.transaction.type),
        userAddress: addressMap.get(vote.voterCommitment) || 'UNKNOWN',
        multisigWallet: vote.transaction.accountAddress,
        txHash: null,
        chainId: vote.transaction.account.chainId,
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
        action: this.mapTxTypeToExecuteAction(tx.type),
        userAddress: addressMap.get(tx.createdBy) || 'UNKNOWN',
        multisigWallet: tx.accountAddress,
        txHash: tx.txHash || 'PENDING',
        chainId: tx.account.chainId,
      });
    }

    // Sort all records by timestamp
    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Count totals by blockchain
    const totalZkVerify = records.filter(
      (r) => this.getBlockchain(r.action, r.chainId) === 'zkVerify',
    ).length;
    const totalHorizen = records.filter(
      (r) => this.getBlockchain(r.action, r.chainId) === 'Horizen',
    ).length;
    const totalBase = records.filter(
      (r) => this.getBlockchain(r.action, r.chainId) === 'Base',
    ).length;

    // Generate CSV
    return this.generateCSV(records, totalZkVerify, totalHorizen, totalBase);
  }

  private getTxHashLink(
    action: string,
    txHash: string,
    chainId?: number | null,
  ): string {
    const isBase = chainId === 8453 || chainId === 84532;

    const explorerMap = {
      zkVerify: this.explorerConfig.ZKVERIFY_EXPLORER,
      chainTx: isBase
        ? this.explorerConfig.BASE_EXPLORER_TX
        : this.explorerConfig.HORIZEN_EXPLORER_TX,
      chainAddress: isBase
        ? this.explorerConfig.BASE_EXPLORER_ADDRESS
        : this.explorerConfig.HORIZEN_EXPLORER_ADDRESS,
    };

    let explorerKey: keyof typeof explorerMap | null = null;

    if (
      action.startsWith('PROPOSE_') ||
      action.startsWith('APPROVE_') ||
      action === 'LOGIN'
    ) {
      explorerKey = 'zkVerify';
    } else if (action === 'CREATE_ACCOUNT') {
      explorerKey = 'chainAddress';
    } else if (action.startsWith('EXECUTE_') || action === 'CLAIM') {
      explorerKey = 'chainTx';
    }

    if (!explorerKey) return '';

    return `${explorerMap[explorerKey]}/${txHash}`;
  }

  private generateCSV(
    records: AnalyticsRecord[],
    totalZkVerify: number,
    totalHorizen: number,
    totalBase: number,
  ): string {
    const totalsHeader = [
      `Total zkVerify,${totalZkVerify}`,
      `Total Horizen,${totalHorizen}`,
      `Total Base,${totalBase}`,
      '', // empty line
    ];

    const header =
      'Timestamp,Blockchain,Action,User Address,Multisig Wallet,TX Hash';

    const rows = records.map((record) => {
      const timestamp = record.timestamp.toISOString();
      const action = record.action;
      const blockchain = this.getBlockchain(record.action, record.chainId);
      const userAddress = record.userAddress
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.userAddress}`
        : '';
      const multisigWallet = record.multisigWallet
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.multisigWallet}`
        : '';

      let txHash = '';
      if (record.txHash && record.txHash !== 'PENDING') {
        txHash = this.getTxHashLink(
          record.action,
          record.txHash,
          record.chainId,
        );
      } else if (record.txHash === 'PENDING') {
        txHash = 'PENDING';
      }

      return `"${timestamp}","${blockchain}","${action}","${userAddress}","${multisigWallet}","${txHash}"`;
    });

    return [...totalsHeader, header, ...rows].join('\n');
  }
}
