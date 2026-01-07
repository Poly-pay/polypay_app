import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import {
  CreateTransactionDto,
  ApproveTransactionDto,
  DenyTransactionDto,
  TxType,
  encodeAddSigner,
  encodeRemoveSigner,
  encodeUpdateThreshold,
  encodeBatchTransferMulti,
  encodeERC20Transfer,
  encodeBatchTransfer,
  TxStatus,
  TX_CREATED_EVENT,
  TX_VOTED_EVENT,
  TX_STATUS_EVENT,
  TxCreatedEventData,
  TxVotedEventData,
  VoteType,
  ProofStatus,
  TxStatusEventData,
  PaginatedResponse,
  DEFAULT_PAGE_SIZE,
} from '@polypay/shared';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { BatchItemService } from '@/batch-item/batch-item.service';
import { DOMAIN_ID_HORIZEN_TESTNET } from '@/common/constants';
import { EventsService } from '@/events/events.service';
import { Transaction } from '@/generated/prisma/client';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private prisma: PrismaService,
    private zkVerifyService: ZkVerifyService,
    private relayerService: RelayerService,
    private batchItemService: BatchItemService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create transaction with txId from smart contract nonce
   */
  async createTransaction(dto: CreateTransactionDto, userCommitment: string) {
    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { address: dto.walletAddress },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    // 1. Validate based on type
    this.validateTransactionDto(dto);

    // 2. Validate nonce is reserved
    const reserved = await this.prisma.reservedNonce.findFirst({
      where: {
        walletAddress: dto.walletAddress,
        nonce: dto.nonce,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reserved) {
      throw new BadRequestException(
        'Nonce not reserved or expired. Please reserve nonce first.',
      );
    }

    // 3. Check wallet exists and get total signers count
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: dto.walletAddress },
      include: { accounts: true },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet ${dto.walletAddress} not found. Please create wallet first.`,
      );
    }

    const totalSigners = wallet.accounts.length;

    // Create batch data
    let batchData: string | null = null;

    if (dto.type === TxType.BATCH && dto.batchItemIds) {
      const batchItems = await this.batchItemService.findByIds(
        dto.batchItemIds,
      );

      if (batchItems.length !== dto.batchItemIds.length) {
        throw new BadRequestException('Some batch items not found');
      }

      // Sort batchItems
      const sortedBatchItems = dto.batchItemIds.map((id) => {
        const item = batchItems.find((b) => b.id === id);
        if (!item) throw new BadRequestException(`Batch item ${id} not found`);
        return item;
      });

      batchData = JSON.stringify(
        sortedBatchItems.map((item) => ({
          recipient: item.recipient,
          amount: item.amount,
          tokenAddress: item.tokenAddress || null,
          contactId: item.contactId || undefined,
          contactName: item.contact?.name || undefined,
        })),
      );
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

    // 5. Create transaction + first vote + delete reservation
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // Delete reservation
      await prisma.reservedNonce.delete({
        where: { id: reserved.id },
      });

      const tx = await prisma.transaction.create({
        data: {
          nonce: dto.nonce,
          type: dto.type,
          walletAddress: dto.walletAddress,
          threshold: dto.threshold,
          to: dto.to,
          value: dto.value,
          tokenAddress: dto.tokenAddress,
          contactId: dto.contactId,
          signerCommitment: dto.signerCommitment,
          newThreshold: dto.newThreshold,
          createdBy: userCommitment,
          status: 'PENDING',
          batchData,
          totalSigners,
        },
      });

      await prisma.vote.create({
        data: {
          txId: tx.txId,
          voterCommitment: userCommitment,
          voteType: 'APPROVE',
          nullifier: dto.nullifier,
          jobId: proofResult.jobId,
          proofStatus: 'PENDING',
          domainId: DOMAIN_ID_HORIZEN_TESTNET,
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

    this.logger.log(
      `Created transaction txId: ${transaction.txId}, nonce: ${transaction.nonce}`,
    );

    // Emit realtime event
    const eventData: TxCreatedEventData = {
      txId: transaction.txId,
      type: transaction.type as TxType,
      walletAddress: transaction.walletAddress,
    };
    this.eventsService.emitToWallet(
      dto.walletAddress,
      TX_CREATED_EVENT,
      eventData,
    );

    return {
      txId: transaction.txId,
      nonce: transaction.nonce,
      type: transaction.type,
      status: transaction.status,
      jobId: proofResult.jobId,
    };
  }

  /**
   * Approve transaction
   */
  async approve(
    txId: number,
    dto: ApproveTransactionDto,
    userCommitment: string,
  ) {
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
          voterCommitment: userCommitment,
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
    const vote = await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: userCommitment,
        voteType: VoteType.APPROVE,
        nullifier: dto.nullifier,
        jobId: proofResult.jobId,
        proofStatus: ProofStatus.PENDING,
        domainId: DOMAIN_ID_HORIZEN_TESTNET,
      },
    });

    this.logger.log(`Vote APPROVE added for txId: ${txId}`);

    // Calculate approve count
    const approveCount = await this.prisma.vote.count({
      where: { txId, voteType: VoteType.APPROVE },
    });

    // Emit realtime event
    const eventData: TxVotedEventData = {
      txId,
      voteType: VoteType.APPROVE,
      approveCount,
      vote: {
        ...vote,
        voteType: vote.voteType as VoteType,
        proofStatus: vote.proofStatus as ProofStatus,
      },
    };
    this.eventsService.emitToWallet(
      transaction.walletAddress,
      TX_VOTED_EVENT,
      eventData,
    );

    return {
      txId,
      voteType: VoteType.APPROVE,
      jobId: proofResult.jobId,
      status: transaction.status,
      approveCount: await this.getApproveCount(txId),
      threshold: transaction.threshold,
    };
  }

  /**
   * Deny transaction
   */
  async deny(txId: number, dto: DenyTransactionDto, userCommitment: string) {
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
          voterCommitment: userCommitment,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException('Already voted on this transaction');
    }

    // 3. Create deny vote
    const vote = await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: userCommitment,
        voteType: VoteType.DENY,
      },
    });

    this.logger.log(`Vote DENY added for txId: ${txId}`);

    // 4. Check if transaction should fail
    await this.checkIfFailed(txId, dto.totalSigners);

    const updatedTx = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    // Calculate approve count
    const approveCount = await this.prisma.vote.count({
      where: { txId, voteType: VoteType.APPROVE },
    });

    // Emit realtime event
    const eventData: TxVotedEventData = {
      txId,
      voteType: VoteType.DENY,
      approveCount,
      vote: {
        ...vote,
        voteType: vote.voteType as VoteType,
        proofStatus: vote.proofStatus as ProofStatus,
      },
    };
    this.eventsService.emitToWallet(
      transaction.walletAddress,
      TX_VOTED_EVENT,
      eventData,
    );

    return {
      txId,
      voteType: VoteType.DENY,
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
        contact: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    return transaction;
  }

  /**
   * Get transactions for a wallet with cursor-based pagination
   */
  async getTransactions(
    walletAddress: string,
    userCommitment: string,
    status?: string,
    limit: number = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<PaginatedResponse<any>> {
    // Check if user is a member of the wallet
    if (userCommitment) {
      const membership = await this.prisma.accountWallet.findFirst({
        where: {
          wallet: { address: walletAddress },
          account: { commitment: userCommitment },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this wallet');
      }
    }

    const where: any = { walletAddress };
    if (status) {
      where.status = status;
    }

    // Fetch limit + 1 to check if there are more items
    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        votes: {
          orderBy: { createdAt: 'asc' },
        },
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    // Check if there are more items
    const hasMore = transactions.length > limit;

    // Remove extra item if exists
    const data = hasMore ? transactions.slice(0, limit) : transactions;

    // Get next cursor from last item
    const nextCursor =
      hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
      hasMore,
    };
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
      commitment: vote.voterCommitment,
      nullifier: vote.nullifier,
      aggregationId: vote.aggregationId,
      domainId: vote.domainId ?? DOMAIN_ID_HORIZEN_TESTNET,
      zkMerklePath: vote.merkleProof,
      leafCount: vote.leafCount,
      index: vote.leafIndex,
    }));

    return {
      txId,
      nonce: transaction.nonce,
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

      // Handle ADD_SIGNER: create Account + AccountWallet link
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

      // Handle REMOVE_SIGNER: delete AccountWallet link + delete pending votes
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

        // Delete all pending votes from removed signer (same wallet only)
        const deletedVotes = await tx.vote.deleteMany({
          where: {
            voterCommitment: transaction.signerCommitment,
            transaction: {
              walletAddress: transaction.walletAddress,
              status: { in: ['PENDING'] },
            },
          },
        });

        if (deletedVotes.count > 0) {
          this.logger.log(
            `Deleted ${deletedVotes.count} pending votes from removed signer ${transaction.signerCommitment}`,
          );
        }
      }

      // Handle SET_THRESHOLD: update threshold for all pending transactions in the same wallet
      if (
        transaction.type === TxType.SET_THRESHOLD &&
        transaction.newThreshold
      ) {
        const updatedTxs = await tx.transaction.updateMany({
          where: {
            walletAddress: transaction.walletAddress,
            status: TxStatus.PENDING,
            txId: { not: txId }, // Exclude current transaction
          },
          data: {
            threshold: transaction.newThreshold,
          },
        });

        if (updatedTxs.count > 0) {
          this.logger.log(
            `Updated threshold to ${transaction.newThreshold} for ${updatedTxs.count} pending transactions in wallet ${transaction.walletAddress}`,
          );
        }
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

      // emit event for status update
      const eventData: TxStatusEventData = {
        txId,
        status: TxStatus.EXECUTED,
        txHash,
      };
      this.eventsService.emitToWallet(
        transaction.walletAddress,
        TX_STATUS_EVENT,
        eventData,
      );

      return updatedTx;
    });
  }

  /**
   * Execute transaction on-chain via relayer
   */
  async executeOnChain(txId: number) {
    // 1. Get execution data
    const executionData = await this.getExecutionData(txId);

    try {
      // 2. Execute via relayer (includes balance check + receipt verification)
      const { txHash } = await this.relayerService.executeTransaction(
        executionData.walletAddress,
        executionData.nonce,
        executionData.to,
        executionData.value,
        executionData.data,
        executionData.zkProofs,
      );

      // 3. Mark as executed only on success
      await this.markExecuted(txId, txHash);

      return { txId, txHash, status: 'EXECUTED' };
    } catch (error) {
      this.logger.error(`Execute failed for txId ${txId}: ${error.message}`);

      // Parse error message for user-friendly response
      if (error.message?.includes('Insufficient wallet balance')) {
        // Extract amounts from error message
        const match = error.message.match(
          /Required: (\d+) wei, Available: (\d+) wei/,
        );
        if (match) {
          const required = BigInt(match[1]);
          const available = BigInt(match[2]);
          // Convert to ETH for readability
          const requiredEth = Number(required) / 1e18;
          const availableEth = Number(available) / 1e18;
          throw new BadRequestException(
            `Insufficient wallet balance. Required: ${requiredEth.toFixed(6)} ETH, Available: ${availableEth.toFixed(6)} ETH`,
          );
        }
      }

      if (error.message?.includes('Transaction reverted')) {
        throw new BadRequestException(
          'Transaction reverted on-chain. Please check contract conditions.',
        );
      }

      // Generic error
      throw new BadRequestException(
        error.message || 'Failed to execute transaction',
      );
    }
  }

  async reserveNonce(walletAddress: string, userCommitment: string) {
    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { address: walletAddress },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Clean expired reservations
      await tx.reservedNonce.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      // 2. Find next available nonce
      const maxTxNonce = await tx.transaction.findFirst({
        where: { walletAddress },
        orderBy: { nonce: 'desc' },
        select: { nonce: true },
      });

      const maxReservedNonce = await tx.reservedNonce.findFirst({
        where: { walletAddress },
        orderBy: { nonce: 'desc' },
        select: { nonce: true },
      });

      const nextNonce = Math.max(
        (maxTxNonce?.nonce ?? -1) + 1,
        (maxReservedNonce?.nonce ?? -1) + 1,
      );

      // 3. Reserve (expires 2 min)
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

      await tx.reservedNonce.create({
        data: { walletAddress, nonce: nextNonce, expiresAt },
      });

      return { nonce: nextNonce, expiresAt };
    });
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

  private buildExecuteParams(transaction: Transaction): {
    to: string;
    value: string;
    data: string;
  } {
    switch (transaction.type) {
      case 'TRANSFER':
        // ERC20 transfer
        if (transaction?.tokenAddress) {
          return {
            to: transaction.tokenAddress, // Token contract address
            value: '0',
            data: encodeERC20Transfer(
              transaction.to,
              BigInt(transaction.value),
            ),
          };
        }
        // Native ETH transfer
        return {
          to: transaction.to,
          value: transaction.value,
          data: '0x',
        };

      case 'ADD_SIGNER':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeAddSigner(
            transaction.signerCommitment,
            transaction.newThreshold,
          ),
        };

      case 'REMOVE_SIGNER':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeRemoveSigner(
            transaction.signerCommitment,
            transaction.newThreshold,
          ),
        };

      case 'SET_THRESHOLD':
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeUpdateThreshold(transaction.newThreshold),
        };

      case 'BATCH':
        const batchData = JSON.parse(transaction.batchData || '[]');
        const recipients = batchData.map((item: any) => item.recipient);
        const amounts = batchData.map((item: any) => BigInt(item.amount));
        const tokenAddresses = batchData.map(
          (item: any) =>
            item.tokenAddress || '0x0000000000000000000000000000000000000000',
        );

        // Check if any ERC20 token in batch
        const hasERC20 = tokenAddresses.some(
          (addr: string) =>
            addr !== '0x0000000000000000000000000000000000000000',
        );

        if (hasERC20) {
          // Use batchTransferMulti for mixed transfers
          return {
            to: transaction.walletAddress,
            value: '0',
            data: encodeBatchTransferMulti(recipients, amounts, tokenAddresses),
          };
        }

        // Use original batchTransfer for ETH-only
        return {
          to: transaction.walletAddress,
          value: '0',
          data: encodeBatchTransfer(recipients, amounts),
        };

      default:
        throw new BadRequestException(`Unknown transaction type`);
    }
  }

  private async checkIfFailed(txId: number, totalSigners: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { votes: true },
    });

    if (!transaction) return;

    const approveCount = transaction.votes.filter(
      (v) => v.voteType === VoteType.APPROVE,
    ).length;
    const totalVoted = transaction.votes.length;

    const remainingVoters = totalSigners - totalVoted;
    const maxPossibleApproves = approveCount + remainingVoters;

    if (maxPossibleApproves < transaction.threshold) {
      await this.prisma.transaction.update({
        where: { txId },
        data: { status: TxStatus.FAILED },
      });

      this.logger.log(
        `Transaction ${txId} FAILED - cannot reach threshold (approve: ${approveCount}, remaining: ${remainingVoters}, need: ${transaction.threshold})`,
      );

      // Emit realtime event
      const eventData: TxStatusEventData = {
        txId,
        status: TxStatus.FAILED,
      };
      this.eventsService.emitToWallet(
        transaction.walletAddress,
        TX_STATUS_EVENT,
        eventData,
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
