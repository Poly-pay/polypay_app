import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import { CreateTransactionDto, ApproveDto, DenyDto, TxType } from './dto';
import { encodeFunctionData } from 'viem';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { BatchItemService } from '@/batch-item/batch-item.service';

const WALLET_ABI = [
  {
    name: 'addSigner',
    type: 'function',
    inputs: [
      { name: 'newCommitment', type: 'uint256' },
      { name: 'newSigRequired', type: 'uint256' },
    ],
  },
  {
    name: 'removeSigner',
    type: 'function',
    inputs: [
      { name: 'commitment', type: 'uint256' },
      { name: 'newSigRequired', type: 'uint256' },
    ],
  },
  {
    name: 'updateSignaturesRequired',
    type: 'function',
    inputs: [{ name: 'newSigRequired', type: 'uint256' }],
  },
  {
    name: 'batchTransfer',
    type: 'function',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
] as const;

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private prisma: PrismaService,
    private zkVerifyService: ZkVerifyService,
    private relayerService: RelayerService,
    private batchItemService: BatchItemService,
  ) {}

  /**
   * Create transaction with txId from smart contract nonce
   */
  async createTransaction(dto: CreateTransactionDto) {
    // 1. Validate based on type
    this.validateTransactionDto(dto);

    // 2. Check wallet exists
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: dto.walletAddress },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet ${dto.walletAddress} not found. Please create wallet first.`,
      );
    }

    // Create batch data
    let batchData: string | null = null;

    if (dto.type === TxType.BATCH && dto.batchItemIds) {
      const batchItems = await this.batchItemService.findByIds(
        dto.batchItemIds,
      );
      if (batchItems.length !== dto.batchItemIds.length) {
        throw new BadRequestException('Some batch items not found');
      }
      batchData = JSON.stringify(
        batchItems.map((item) => ({
          recipient: item.recipient,
          amount: item.amount,
        })),
      );
    }

    // 3. Submit proof to zkVerify
    const proofResult = await this.zkVerifyService.submitProofAndWaitFinalized({
      proof: dto.proof,
      publicInputs: dto.publicInputs,
      vk: dto.vk,
    });

    if (proofResult.status === 'Failed') {
      throw new BadRequestException('Proof verification failed');
    }

    // 4. Create transaction + first vote
    const transaction = await this.prisma.$transaction(async (prisma) => {
      const tx = await prisma.transaction.create({
        data: {
          nonce: dto.nonce,
          type: dto.type,
          walletAddress: dto.walletAddress,
          threshold: dto.threshold,
          to: dto.to,
          value: dto.value,
          signerCommitment: dto.signerCommitment,
          newThreshold: dto.newThreshold,
          createdBy: dto.creatorCommitment,
          status: 'PENDING',
          batchData,
        },
      });

      await prisma.vote.create({
        data: {
          txId: tx.txId,
          voterCommitment: dto.creatorCommitment,
          voteType: 'APPROVE',
          nullifier: dto.nullifier,
          jobId: proofResult.jobId,
          proofStatus: 'PENDING',
        },
      });

      // After successful creation, clear used batch items
      if (dto.type === TxType.BATCH && dto.batchItemIds) {
        await Promise.all(
          dto.batchItemIds.map((id) => this.batchItemService.delete(id)),
        );
      }

      return tx;
    });

    this.logger.log(`Created transaction txId: ${transaction.txId}`);

    // 5. Check if already enough approvals (threshold = 1)
    const result = await this.checkAndTriggerExecution(transaction.txId);

    return {
      txId: transaction.txId,
      type: transaction.type,
      status: result?.status || transaction.status,
      jobId: proofResult.jobId,
    };
  }

  /**
   * Approve transaction
   */
  async approve(txId: number, dto: ApproveDto) {
    // 1. Check transaction exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    if (transaction.status === 'EXECUTED') {
      throw new BadRequestException('Transaction already executed');
    }

    if (transaction.status === 'FAILED') {
      throw new BadRequestException('Transaction has failed');
    }

    // 2. Check not already voted
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        txId_voterCommitment: {
          txId,
          voterCommitment: dto.voterCommitment,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException('Already voted on this transaction');
    }

    // 3. Check nullifier unique
    const nullifierUsed = await this.prisma.vote.findFirst({
      where: {
        nullifier: dto.nullifier,
        txId: txId,
      },
    });

    if (nullifierUsed) {
      throw new BadRequestException('Nullifier already used');
    }

    // 4. Submit proof to zkVerify
    const proofResult = await this.zkVerifyService.submitProofAndWaitFinalized({
      proof: dto.proof,
      publicInputs: dto.publicInputs,
      vk: dto.vk,
    });

    if (proofResult.status === 'Failed') {
      throw new BadRequestException('Proof verification failed');
    }

    // 5. Create vote
    await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: dto.voterCommitment,
        voteType: 'APPROVE',
        nullifier: dto.nullifier,
        jobId: proofResult.jobId,
        proofStatus: 'PENDING',
      },
    });

    this.logger.log(`Vote APPROVE added for txId: ${txId}`);

    // 6. Check if enough approvals
    const result = await this.checkAndTriggerExecution(txId);

    return {
      txId,
      voteType: 'APPROVE',
      jobId: proofResult.jobId,
      status: result?.status || transaction.status,
      approveCount: await this.getApproveCount(txId),
      threshold: transaction.threshold,
    };
  }

  /**
   * Deny transaction
   */
  async deny(txId: number, dto: DenyDto) {
    // 1. Check transaction exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    if (transaction.status === 'EXECUTED') {
      throw new BadRequestException('Transaction already executed');
    }

    if (transaction.status === 'FAILED') {
      throw new BadRequestException('Transaction already failed');
    }

    // 2. Check not already voted
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        txId_voterCommitment: {
          txId,
          voterCommitment: dto.voterCommitment,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException('Already voted on this transaction');
    }

    // 3. Create deny vote
    await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: dto.voterCommitment,
        voteType: 'DENY',
      },
    });

    this.logger.log(`Vote DENY added for txId: ${txId}`);

    // 4. Check if transaction should fail
    await this.checkIfFailed(txId, dto.totalSigners);

    const updatedTx = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    return {
      txId,
      voteType: 'DENY',
      status: updatedTx?.status,
      denyCount: await this.getDenyCount(txId),
    };
  }

  /**
   * Get transaction with votes
   */
  async getTransaction(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: {
        votes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    return transaction;
  }

  /**
   * Get all transactions for a wallet
   */
  async getTransactions(walletAddress: string, status?: string) {
    const where: any = { walletAddress };
    if (status) {
      where.status = status;
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        votes: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get execution data for smart contract
   */
  async getExecutionData(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    // Aggregate all pending proofs (poll until all aggregated)
    await this.aggregateProofs(txId);

    // Get aggregated approve votes
    const approveVotes = await this.prisma.vote.findMany({
      where: {
        txId,
        voteType: 'APPROVE',
        proofStatus: 'AGGREGATED',
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
      nullifier: vote.nullifier,
      aggregationId: vote.aggregationId,
      domainId: vote.domainId ?? 0,
      zkMerklePath: vote.merkleProof,
      leafCount: vote.leafCount,
      index: vote.leafIndex,
    }));

    return {
      txId,
      walletAddress: transaction.walletAddress,
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
      // 1. Find the transaction
      const transaction = await tx.transaction.findUnique({
        where: { txId },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${txId} not found`);
      }

      // 2. Mark all transactions with same nonce as OUTDATED (except this one)
      await tx.transaction.updateMany({
        where: {
          nonce: transaction.nonce,
          walletAddress: transaction.walletAddress,
          txId: { not: txId },
          status: { notIn: ['EXECUTED', 'OUTDATED', 'FAILED'] },
        },
        data: {
          status: 'OUTDATED',
        },
      });

      // 3. Handle ADD_SIGNER: create Account + AccountWallet link
      if (
        transaction.type === TxType.ADD_SIGNER &&
        transaction.signerCommitment
      ) {
        const wallet = await tx.wallet.findUnique({
          where: { address: transaction.walletAddress },
        });

        if (wallet) {
          // Upsert account for new signer
          const account = await tx.account.upsert({
            where: { commitment: transaction.signerCommitment },
            create: { commitment: transaction.signerCommitment },
            update: {},
          });

          // Create AccountWallet link (ignore if already exists)
          await tx.accountWallet.upsert({
            where: {
              accountId_walletId: {
                accountId: account.id,
                walletId: wallet.id,
              },
            },
            create: {
              accountId: account.id,
              walletId: wallet.id,
              isCreator: false,
            },
            update: {},
          });

          this.logger.log(
            `Added signer ${transaction.signerCommitment} to wallet ${wallet.address}`,
          );
        }
      }

      // 4. Handle REMOVE_SIGNER: delete AccountWallet link
      if (
        transaction.type === 'REMOVE_SIGNER' &&
        transaction.signerCommitment
      ) {
        const wallet = await tx.wallet.findUnique({
          where: { address: transaction.walletAddress },
        });

        const account = await tx.account.findUnique({
          where: { commitment: transaction.signerCommitment },
        });

        if (wallet && account) {
          await tx.accountWallet.deleteMany({
            where: {
              accountId: account.id,
              walletId: wallet.id,
            },
          });

          this.logger.log(
            `Removed signer ${transaction.signerCommitment} from wallet ${wallet.address}`,
          );
        }
      }

      // 5. Mark this transaction as EXECUTED
      return tx.transaction.update({
        where: { txId },
        data: {
          status: 'EXECUTED',
          txHash,
          executedAt: new Date(),
        },
      });
    });
  }

  /**
   * Execute transaction on-chain via relayer
   */
  async executeOnChain(txId: number) {
    // 1. Get execution data
    const executionData = await this.getExecutionData(txId);

    // 2. Execute via relayer
    const { txHash } = await this.relayerService.executeTransaction(
      executionData.walletAddress,
      executionData.to,
      executionData.value,
      executionData.data,
      executionData.zkProofs,
    );

    // 3. Mark as executed
    await this.markExecuted(txId, txHash);

    return { txId, txHash, status: 'EXECUTED' };
  }

  // ============ Private Methods ============

  private validateTransactionDto(dto: CreateTransactionDto) {
    switch (dto.type) {
      case TxType.TRANSFER:
        if (!dto.to || !dto.value) {
          throw new BadRequestException('Transfer requires "to" and "value"');
        }
        break;

      case TxType.ADD_SIGNER:
        if (!dto.signerCommitment || dto.newThreshold === undefined) {
          throw new BadRequestException(
            'Add signer requires "signerCommitment" and "newThreshold"',
          );
        }
        break;

      case TxType.REMOVE_SIGNER:
        if (!dto.signerCommitment || dto.newThreshold === undefined) {
          throw new BadRequestException(
            'Remove signer requires "signerCommitment" and "newThreshold"',
          );
        }
        break;

      case TxType.SET_THRESHOLD:
        if (dto.newThreshold === undefined) {
          throw new BadRequestException(
            'Set threshold requires "newThreshold"',
          );
        }
        break;

      case TxType.BATCH:
        if (!dto.batchItemIds || dto.batchItemIds.length === 0) {
          throw new BadRequestException('Batch requires "batchItemIds"');
        }
        break;
    }
  }

  private buildExecuteParams(transaction: any): {
    to: string;
    value: string;
    data: string;
  } {
    switch (transaction.type) {
      case 'TRANSFER':
        return {
          to: transaction.to,
          value: transaction.value,
          data: '0x',
        };

      case 'ADD_SIGNER':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeFunctionData({
            abi: WALLET_ABI,
            functionName: 'addSigner',
            args: [
              BigInt(transaction.signerCommitment),
              BigInt(transaction.newThreshold),
            ],
          }),
        };

      case 'REMOVE_SIGNER':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeFunctionData({
            abi: WALLET_ABI,
            functionName: 'removeSigner',
            args: [
              BigInt(transaction.signerCommitment),
              BigInt(transaction.newThreshold),
            ],
          }),
        };

      case 'SET_THRESHOLD':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeFunctionData({
            abi: WALLET_ABI,
            functionName: 'updateSignaturesRequired',
            args: [BigInt(transaction.newThreshold)],
          }),
        };

      case 'BATCH':
        // Batch data is stored in transaction.batchData (JSON)
        const batchData = JSON.parse(transaction.batchData || '[]');
        const recipients = batchData.map((item: any) => item.recipient);
        const amounts = batchData.map((item: any) => BigInt(item.amount));

        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeFunctionData({
            abi: WALLET_ABI,
            functionName: 'batchTransfer',
            args: [recipients, amounts],
          }),
        };

      default:
        throw new BadRequestException(`Unknown transaction type`);
    }
  }

  private async checkAndTriggerExecution(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    if (!transaction || transaction.status !== 'PENDING') {
      return null;
    }

    const approveCount = await this.getApproveCount(txId);

    if (approveCount >= transaction.threshold) {
      await this.prisma.transaction.update({
        where: { txId },
        data: { status: 'EXECUTING' },
      });

      this.logger.log(
        `Transaction ${txId} has enough approvals (${approveCount}/${transaction.threshold}), ready for execution`,
      );

      return { status: 'EXECUTING', approveCount };
    }

    return null;
  }

  private async checkIfFailed(txId: number, totalSigners: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { votes: true },
    });

    if (!transaction) return;

    const approveCount = transaction.votes.filter(
      (v) => v.voteType === 'APPROVE',
    ).length;
    const totalVoted = transaction.votes.length;

    const remainingVoters = totalSigners - totalVoted;
    const maxPossibleApproves = approveCount + remainingVoters;

    if (maxPossibleApproves < transaction.threshold) {
      await this.prisma.transaction.update({
        where: { txId },
        data: { status: 'FAILED' },
      });

      this.logger.log(
        `Transaction ${txId} FAILED - cannot reach threshold (approve: ${approveCount}, remaining: ${remainingVoters}, need: ${transaction.threshold})`,
      );
    }
  }

  private async aggregateProofs(
    txId: number,
    maxAttempts = 30,
    intervalMs = 5000,
  ) {
    let hasRecentAggregation = false;
    const TWO_MINUTES_MS = 2 * 60 * 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pendingVotes = await this.prisma.vote.findMany({
        where: {
          txId,
          voteType: 'APPROVE',
          proofStatus: 'PENDING',
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

            // Check if this aggregation is recent (< 2 minutes)
            const updatedAt = new Date(jobStatus.updatedAt).getTime();
            const now = Date.now();
            if (now - updatedAt < TWO_MINUTES_MS) {
              hasRecentAggregation = true;
            }

            await this.prisma.vote.update({
              where: { id: vote.id },
              data: {
                proofStatus: 'AGGREGATED',
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
              data: { proofStatus: 'FAILED' },
            });

            this.logger.error(`Vote ${vote.id} proof failed`);
          }
        } catch (error) {
          this.logger.error(`Error checking vote ${vote.id}:`, error);
        }
      }

      await this.sleep(intervalMs);
    }

    // Check if all proofs are aggregated
    const stillPending = await this.prisma.vote.count({
      where: {
        txId,
        voteType: 'APPROVE',
        proofStatus: 'PENDING',
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

    // Wait 40s only if there's recent aggregation (< 2 minutes)
    if (hasRecentAggregation) {
      this.logger.log(
        'Recent aggregation detected, waiting 40s for cross-chain finalization...',
      );
      await this.sleep(40000);
    } else {
      this.logger.log('All aggregations are old (> 2 minutes), skipping wait');
    }
  }

  private async getApproveCount(txId: number): Promise<number> {
    return this.prisma.vote.count({
      where: { txId, voteType: 'APPROVE' },
    });
  }

  private async getDenyCount(txId: number): Promise<number> {
    return this.prisma.vote.count({
      where: { txId, voteType: 'DENY' },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
