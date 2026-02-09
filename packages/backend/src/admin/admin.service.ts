import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';

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

  async generateAnalyticsReport(): Promise<string> {
    const records: AnalyticsRecord[] = [];

    // 1. LOGIN records
    const loginRecords = await this.prisma.loginHistory.findMany({
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

    // 2. CREATE_ACCOUNT records
    const accounts = await this.prisma.account.findMany({
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
        txHash: account.address, // Use multisig address as link
      });
    }

    // 3. APPROVE records
    const approveVotes = await this.prisma.vote.findMany({
      where: { voteType: 'APPROVE' },
      include: { transaction: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const vote of approveVotes) {
      const loginHistory = await this.prisma.loginHistory.findFirst({
        where: { commitment: vote.voterCommitment },
        orderBy: { createdAt: 'desc' },
      });

      records.push({
        timestamp: vote.createdAt,
        action: 'APPROVE',
        userAddress: loginHistory?.walletAddress || 'UNKNOWN',
        multisigWallet: vote.transaction.accountAddress,
        txHash: vote.zkVerifyTxHash || 'PENDING',
      });
    }

    // 4. DENY records
    const denyVotes = await this.prisma.vote.findMany({
      where: { voteType: 'DENY' },
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

    // 5. EXECUTE records
    const executedTxs = await this.prisma.transaction.findMany({
      where: { status: 'EXECUTED' },
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
    return this.generateCSV(records);
  }

  private generateCSV(records: AnalyticsRecord[]): string {
    const header = 'Timestamp,Action,User Address,Multisig Wallet,TX Hash';

    const rows = records.map((record) => {
      const timestamp = record.timestamp.toISOString();
      const action = record.action;
      const userAddress = record.userAddress
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.userAddress}`
        : '';
      const multisigWallet = record.multisigWallet
        ? `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.multisigWallet}`
        : '';

      let txHash = '';
      if (record.txHash && record.txHash !== 'PENDING') {
        if (record.action === 'LOGIN' || record.action === 'APPROVE') {
          txHash = `${this.explorerConfig.ZKVERIFY_EXPLORER}/${record.txHash}`;
        } else if (record.action === 'CREATE_ACCOUNT') {
          txHash = `${this.explorerConfig.HORIZEN_EXPLORER_ADDRESS}/${record.txHash}`;
        } else if (record.action === 'EXECUTE') {
          txHash = `${this.explorerConfig.HORIZEN_EXPLORER_TX}/${record.txHash}`;
        }
      } else if (record.txHash === 'PENDING') {
        txHash = 'PENDING';
      }

      return `"${timestamp}","${action}","${userAddress}","${multisigWallet}","${txHash}"`;
    });

    return [header, ...rows].join('\n');
  }
}
