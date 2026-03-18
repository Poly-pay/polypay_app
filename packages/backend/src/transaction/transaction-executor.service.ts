import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import {
  TxType,
  encodeUpdateThreshold,
  encodeBatchTransferMulti,
  encodeERC20Transfer,
  encodeBatchTransfer,
  TxStatus,
  TX_STATUS_EVENT,
  VoteType,
  ProofStatus,
  TxStatusEventData,
  encodeAddSigners,
  encodeRemoveSigners,
  SignerData,
  ZERO_ADDRESS,
} from '@polypay/shared';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import {
  CROSS_CHAIN_FINALIZATION_WAIT,
  PROOF_AGGREGATION_INTERVAL,
  PROOF_AGGREGATION_MAX_ATTEMPTS,
  RECENT_AGGREGATION_THRESHOLD,
  ETH_DISPLAY_DECIMALS,
  WEI_PER_ETH,
} from '@/common/constants/timing';
import { EventsService } from '@/events/events.service';
import { Transaction } from '@/generated/prisma/client';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';
import { QuestService } from '@/quest/quest.service';

@Injectable()
export class TransactionExecutorService {
  private readonly logger = new Logger(TransactionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zkVerifyService: ZkVerifyService,
    private readonly relayerService: RelayerService,
    private readonly eventsService: EventsService,
    private readonly analyticsLogger: AnalyticsLoggerService,
    private readonly questService: QuestService,
  ) {}

  /**
   * Execute transaction on-chain via relayer
   */
  async executeOnChain(txId: number, userAddress?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { account: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    // Mark as EXECUTING
    await this.updateStatusAndEmit(
      txId,
      transaction.accountAddress,
      TxStatus.EXECUTING,
    );

    // 1. Get execution data
    const executionData = await this.getExecutionData(txId, transaction);

    // Track whether tx was submitted on-chain (txHash saved to DB)
    let submittedTxHash: string | null = null;

    try {
      // 2. Execute via relayer
      const { txHash } = await this.relayerService.executeTransaction(
        executionData.accountAddress,
        executionData.nonce,
        executionData.to,
        executionData.value,
        executionData.data,
        transaction.account.chainId,
        executionData.zkProofs,
        // Save txHash to DB immediately after on-chain submission,
        // before waiting for receipt. This prevents stuck EXECUTING state
        // if receipt polling or markExecuted fails.
        async (txHash: string) => {
          submittedTxHash = txHash;
          await this.prisma.transaction.update({
            where: { txId },
            data: { txHash },
          });
          this.logger.log(
            `Persisted txHash ${txHash} for txId ${txId} before receipt confirmation`,
          );
        },
      );

      // 3. Mark as executed only on success
      const { pointsAwarded } = await this.markExecuted(txId, txHash);

      this.analyticsLogger.logExecute(
        userAddress,
        transaction.accountAddress,
        txHash,
      );

      return { txId, txHash, status: TxStatus.EXECUTED, pointsAwarded };
    } catch (error) {
      this.logger.error(`Execute failed for txId ${txId}: ${error.message}`);

      if (submittedTxHash) {
        // Tx was submitted on-chain — need to distinguish revert vs unknown failure
        const isOnChainRevert =
          error.message?.includes('reverted') || error.message?.includes('Transaction reverted');

        if (isOnChainRevert) {
          // Tx confirmed as REVERTED on-chain — safe to revert to PENDING
          this.logger.warn(
            `txId ${txId} reverted on-chain (txHash: ${submittedTxHash}). Reverting to PENDING.`,
          );
          await this.updateStatusAndEmit(
            txId,
            executionData.accountAddress,
            TxStatus.PENDING,
          );
          throw new BadRequestException(
            'Transaction reverted on-chain. Please check contract conditions.',
          );
        }

        // Receipt timeout, network error, or markExecuted DB failure.
        // Tx may have succeeded on-chain — keep EXECUTING + txHash for reconciliation.
        this.logger.warn(
          `txId ${txId} has on-chain txHash ${submittedTxHash} but post-submission failed: ${error.message}. Status kept as EXECUTING for reconciliation.`,
        );
        throw new BadRequestException(
          'Transaction was submitted on-chain but confirmation failed. Please check transaction status.',
        );
      }

      // Tx was NOT submitted on-chain — safe to revert to PENDING
      await this.updateStatusAndEmit(
        txId,
        executionData.accountAddress,
        TxStatus.PENDING,
      );

      if (error.message?.includes('Insufficient wallet balance')) {
        const match = error.message.match(
          /Required: (\d+) wei, Available: (\d+) wei/,
        );
        if (match) {
          const required = BigInt(match[1]);
          const available = BigInt(match[2]);
          const requiredEth = Number(required) / WEI_PER_ETH;
          const availableEth = Number(available) / WEI_PER_ETH;
          throw new BadRequestException(
            `Insufficient account balance. Required: ${requiredEth.toFixed(ETH_DISPLAY_DECIMALS)} ETH, Available: ${availableEth.toFixed(ETH_DISPLAY_DECIMALS)} ETH`,
          );
        }
      }

      throw new BadRequestException(
        error.message || 'Failed to execute transaction',
      );
    }
  }

  /**
   * Get execution data for smart contract
   */
  async getExecutionData(txId: number, transaction: Transaction) {
    // Aggregate all pending proofs (poll until all aggregated)
    await this.aggregateProofs(txId);

    // Get aggregated approve votes
    const approveVotes = await this.prisma.vote.findMany({
      where: {
        txId,
        voteType: VoteType.APPROVE,
        proofStatus: ProofStatus.AGGREGATED,
      },
    });

    if (approveVotes.length < transaction.threshold) {
      throw new BadRequestException(
        `Not enough aggregated proofs. Required: ${transaction.threshold}, Got: ${approveVotes.length}`,
      );
    }

    // Build execute params based on tx type
    const { to, value, data } = this.buildExecuteParams(transaction);

    // Format proofs for smart contract
    const zkProofs = approveVotes.map((vote) => ({
      commitment: vote.voterCommitment,
      nullifier: vote.nullifier,
      aggregationId: vote.aggregationId,
      domainId: vote.domainId,
      zkMerklePath: vote.merkleProof,
      leafCount: vote.leafCount,
      index: vote.leafIndex,
    }));

    return {
      txId,
      nonce: transaction.nonce,
      accountAddress: transaction.accountAddress,
      to,
      value,
      data,
      zkProofs,
      threshold: transaction.threshold,
    };
  }

  /**
   * Mark transaction as executed
   */
  async markExecuted(txId: number, txHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { txId },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${txId} not found`);
      }

      // Handle signer/threshold changes
      if (transaction.type === TxType.ADD_SIGNER && transaction.signerData) {
        await this.handleAddSignerExecution(tx, transaction, txId);
      }

      if (transaction.type === TxType.REMOVE_SIGNER && transaction.signerData) {
        await this.handleRemoveSignerExecution(tx, transaction, txId);
      }

      if (
        transaction.type === TxType.SET_THRESHOLD &&
        transaction.newThreshold
      ) {
        await this.updatePendingTransactionThreshold(
          tx,
          transaction.accountAddress,
          transaction.newThreshold,
          txId,
        );
      }

      // Mark this transaction as EXECUTED
      const updatedTx = tx.transaction.update({
        where: { txId },
        data: {
          status: TxStatus.EXECUTED,
          txHash,
          executedAt: new Date(),
        },
      });

      // Award quest points (only for TRANSFER and BATCH transactions)
      let pointsAwarded = 0;
      if (
        transaction.type === TxType.TRANSFER ||
        transaction.type === TxType.BATCH
      ) {
        try {
          const successfulTxPoints = await this.questService.awardSuccessfulTx(
            txId,
            transaction.createdBy,
          );
          const firstTxPoints = await this.questService.awardAccountFirstTx(
            transaction.accountAddress,
            txId,
          );
          pointsAwarded = successfulTxPoints + firstTxPoints;
        } catch (error) {
          this.logger.error(`Failed to award quest points: ${error.message}`);
        }
      }

      // Emit event for status update
      const eventData: TxStatusEventData = {
        txId,
        status: TxStatus.EXECUTED,
        txHash,
      };
      this.eventsService.emitToAccount(
        transaction.accountAddress,
        TX_STATUS_EVENT,
        eventData,
      );

      const result = await updatedTx;
      return { ...result, pointsAwarded };
    });
  }

  // ============ Private Methods ============

  private async handleAddSignerExecution(
    tx: any,
    transaction: Transaction,
    txId: number,
  ) {
    const signers: SignerData[] = JSON.parse(transaction.signerData);

    const account = await tx.account.findUnique({
      where: { address: transaction.accountAddress },
    });

    if (!account) return;

    for (const signer of signers) {
      const user = await tx.user.upsert({
        where: { commitment: signer.commitment },
        create: { commitment: signer.commitment },
        update: {},
      });

      await tx.accountSigner.upsert({
        where: {
          userId_accountId: {
            userId: user.id,
            accountId: account.id,
          },
        },
        create: {
          userId: user.id,
          accountId: account.id,
          isCreator: false,
          displayName: signer.name || null,
        },
        update: {
          displayName: signer.name || undefined,
        },
      });

      this.logger.log(
        `Added signer ${signer.commitment} (${signer.name || 'no name'}) to account ${account.address}`,
      );
    }

    if (transaction.newThreshold) {
      await this.updatePendingTransactionThreshold(
        tx,
        transaction.accountAddress,
        transaction.newThreshold,
        txId,
      );
    }
  }

  private async handleRemoveSignerExecution(
    tx: any,
    transaction: Transaction,
    txId: number,
  ) {
    const signers: SignerData[] = JSON.parse(transaction.signerData);

    const account = await tx.account.findUnique({
      where: { address: transaction.accountAddress },
    });

    if (!account) return;

    for (const signer of signers) {
      const user = await tx.user.findUnique({
        where: { commitment: signer.commitment },
      });

      if (user) {
        await tx.accountSigner.deleteMany({
          where: {
            userId: user.id,
            accountId: account.id,
          },
        });

        this.logger.log(
          `Removed signer ${signer.commitment} from account ${account.address}`,
        );
      }

      // Delete all pending votes from removed signer (same account only)
      const deletedVotes = await tx.vote.deleteMany({
        where: {
          voterCommitment: signer.commitment,
          transaction: {
            accountAddress: transaction.accountAddress,
            status: { in: [TxStatus.PENDING] },
          },
        },
      });

      if (deletedVotes.count > 0) {
        this.logger.log(
          `Deleted ${deletedVotes.count} pending votes from removed signer ${signer.commitment}`,
        );
      }
    }

    if (transaction.newThreshold) {
      await this.updatePendingTransactionThreshold(
        tx,
        transaction.accountAddress,
        transaction.newThreshold,
        txId,
      );
    }
  }

  private async updatePendingTransactionThreshold(
    tx: any,
    accountAddress: string,
    newThreshold: number,
    currentTxId: number,
  ) {
    const updatedTxs = await tx.transaction.updateMany({
      where: {
        accountAddress,
        status: TxStatus.PENDING,
        txId: { not: currentTxId },
      },
      data: {
        threshold: newThreshold,
      },
    });

    if (updatedTxs.count > 0) {
      this.logger.log(
        `Updated threshold to ${newThreshold} for ${updatedTxs.count} pending transactions in account ${accountAddress}`,
      );
    }
  }

  private buildExecuteParams(transaction: Transaction): {
    to: string;
    value: string;
    data: string;
  } {
    switch (transaction.type) {
      case TxType.TRANSFER:
        if (transaction?.tokenAddress) {
          return {
            to: transaction.tokenAddress,
            value: '0',
            data: encodeERC20Transfer(
              transaction.to,
              BigInt(transaction.value),
            ),
          };
        }
        return {
          to: transaction.to,
          value: transaction.value,
          data: '0x',
        };

      case TxType.ADD_SIGNER: {
        const signers: SignerData[] = transaction.signerData
          ? JSON.parse(transaction.signerData)
          : [];
        return {
          to: transaction.accountAddress,
          value: '0',
          data: encodeAddSigners(
            signers.map((s) => s.commitment),
            transaction.newThreshold,
          ),
        };
      }

      case TxType.REMOVE_SIGNER: {
        const signers: SignerData[] = transaction.signerData
          ? JSON.parse(transaction.signerData)
          : [];
        return {
          to: transaction.accountAddress,
          value: '0',
          data: encodeRemoveSigners(
            signers.map((s) => s.commitment),
            transaction.newThreshold,
          ),
        };
      }

      case TxType.SET_THRESHOLD:
        return {
          to: transaction.accountAddress,
          value: '0',
          data: encodeUpdateThreshold(transaction.newThreshold),
        };

      case TxType.BATCH:
        const batchData = JSON.parse(transaction.batchData || '[]');
        const recipients = batchData.map((item: any) => item.recipient);
        const amounts = batchData.map((item: any) => BigInt(item.amount));
        const tokenAddresses = batchData.map(
          (item: any) => item.tokenAddress || ZERO_ADDRESS,
        );

        const hasERC20 = tokenAddresses.some(
          (addr: string) => addr !== ZERO_ADDRESS,
        );

        if (hasERC20) {
          return {
            to: transaction.accountAddress,
            value: '0',
            data: encodeBatchTransferMulti(recipients, amounts, tokenAddresses),
          };
        }

        return {
          to: transaction.accountAddress,
          value: '0',
          data: encodeBatchTransfer(recipients, amounts),
        };

      default:
        throw new BadRequestException(`Unknown transaction type`);
    }
  }

  private async aggregateProofs(
    txId: number,
    maxAttempts = PROOF_AGGREGATION_MAX_ATTEMPTS,
    intervalMs = PROOF_AGGREGATION_INTERVAL,
  ) {
    let hasRecentAggregation = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pendingVotes = await this.prisma.vote.findMany({
        where: {
          txId,
          voteType: VoteType.APPROVE,
          proofStatus: ProofStatus.PENDING,
        },
      });

      if (pendingVotes.length === 0) {
        this.logger.log(`All proofs aggregated for txId: ${txId}`);
        break;
      }

      this.logger.log(
        `Attempt ${attempt + 1}/${maxAttempts}: ${pendingVotes.length} pending proofs for txId: ${txId}`,
      );

      for (const vote of pendingVotes) {
        if (!vote.jobId) continue;

        try {
          const jobStatus = await this.zkVerifyService.getJobStatus(vote.jobId);

          if (jobStatus.status === 'Aggregated') {
            this.logger.log(`job data: ${JSON.stringify(jobStatus)}`);

            const updatedAt = new Date(jobStatus.updatedAt).getTime();
            const now = Date.now();
            if (now - updatedAt < RECENT_AGGREGATION_THRESHOLD) {
              hasRecentAggregation = true;
            }

            await this.prisma.vote.update({
              where: { id: vote.id },
              data: {
                proofStatus: ProofStatus.AGGREGATED,
                aggregationId: jobStatus.aggregationId?.toString(),
                merkleProof: jobStatus.aggregationDetails?.merkleProof || [],
                leafCount: jobStatus.aggregationDetails?.numberOfLeaves,
                leafIndex: jobStatus.aggregationDetails?.leafIndex,
              },
            });

            this.logger.log(`Vote ${vote.id} aggregated successfully`);
          } else if (jobStatus.status === 'Failed') {
            await this.prisma.vote.update({
              where: { id: vote.id },
              data: { proofStatus: ProofStatus.FAILED },
            });

            this.logger.error(`Vote ${vote.id} proof failed`);
          }
        } catch (error) {
          this.logger.error(`Error checking vote ${vote.id}:`, error);
        }
      }

      await this.sleep(intervalMs);
    }

    const stillPending = await this.prisma.vote.count({
      where: {
        txId,
        voteType: VoteType.APPROVE,
        proofStatus: ProofStatus.PENDING,
      },
    });

    if (stillPending > 0) {
      this.logger.warn(
        `Timeout: ${stillPending} proofs still pending for txId: ${txId}`,
      );
      throw new BadRequestException(
        `Timeout waiting for proof aggregation. ${stillPending} proofs still pending.`,
      );
    }

    if (hasRecentAggregation) {
      this.logger.log(
        'Recent aggregation detected, waiting 40s for cross-chain finalization...',
      );
      await this.sleep(CROSS_CHAIN_FINALIZATION_WAIT);
    } else {
      this.logger.log('All aggregations are old (> 2 minutes), skipping wait');
    }
  }

  private async updateStatusAndEmit(
    txId: number,
    accountAddress: string,
    status: TxStatus,
    txHash?: string,
  ) {
    await this.prisma.transaction.update({
      where: { txId },
      data: { status },
    });

    const eventData: TxStatusEventData = { txId, status, txHash };
    this.eventsService.emitToAccount(
      accountAddress,
      TX_STATUS_EVENT,
      eventData,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
