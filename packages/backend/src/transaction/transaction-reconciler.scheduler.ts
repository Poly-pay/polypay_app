import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createPublicClient, http, type Hex } from 'viem';
import { PrismaService } from '@/database/prisma.service';
import { TransactionExecutorService } from './transaction-executor.service';
import { TxStatus, getChainById } from '@polypay/shared';

@Injectable()
export class TransactionReconcilerScheduler {
  private readonly logger = new Logger(TransactionReconcilerScheduler.name);
  private readonly publicClients = new Map<number, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionExecutor: TransactionExecutorService,
  ) {}

  private getPublicClient(chainId: number) {
    let client = this.publicClients.get(chainId);
    if (!client) {
      const chain = getChainById(chainId);
      client = createPublicClient({ chain, transport: http() });
      this.publicClients.set(chainId, client);
    }
    return client;
  }

  // 13:00 Vietnam time = 06:00 UTC
  @Cron('0 6 * * *', { timeZone: 'UTC' })
  async reconcileStuckTransactions() {
    this.logger.log('Running daily transaction reconciliation');

    const stuckTxs = await this.prisma.transaction.findMany({
      where: {
        txHash: { not: null },
        status: { in: [TxStatus.EXECUTING, TxStatus.PENDING] },
      },
      include: { account: true },
    });

    if (stuckTxs.length === 0) {
      this.logger.log('No stuck transactions found');
      return;
    }

    this.logger.log(`Found ${stuckTxs.length} stuck transactions with txHash`);

    let reconciled = 0;
    let reverted = 0;
    let skipped = 0;

    for (const tx of stuckTxs) {
      try {
        const publicClient = this.getPublicClient(tx.account.chainId);
        const receipt = await publicClient.getTransactionReceipt({
          hash: tx.txHash as Hex,
        });

        if (receipt.status === 'success') {
          await this.transactionExecutor.markExecuted(tx.txId, tx.txHash);
          this.logger.log(
            `txId ${tx.txId} reconciled to EXECUTED (txHash: ${tx.txHash})`,
          );
          reconciled++;
        } else {
          // receipt.status === 'reverted'
          await this.prisma.transaction.update({
            where: { txId: tx.txId },
            data: { status: TxStatus.PENDING, txHash: null },
          });
          this.logger.warn(
            `txId ${tx.txId} reverted on-chain, reset to PENDING`,
          );
          reverted++;
        }
      } catch (error) {
        // No receipt found (tx not mined or invalid hash) — skip
        this.logger.warn(
          `txId ${tx.txId} receipt not found, skipping: ${error.message}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Reconciliation complete: ${reconciled} executed, ${reverted} reverted, ${skipped} skipped`,
    );
  }
}
