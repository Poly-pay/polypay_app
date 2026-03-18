import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import {
  CreateTransactionDto,
  ApproveTransactionDto,
  TxType,
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
import { BatchItemService } from '@/batch-item/batch-item.service';
import { NONCE_RESERVATION_TTL } from '@/common/constants/timing';
import { checkAccountMembership } from '@/common/utils/membership';
import { EventsService } from '@/events/events.service';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';
import { getDomainId } from '@/common/utils/proof';
import { TransactionExecutorService } from './transaction-executor.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private prisma: PrismaService,
    private zkVerifyService: ZkVerifyService,
    private batchItemService: BatchItemService,
    private readonly eventsService: EventsService,
    private readonly analyticsLogger: AnalyticsLoggerService,
    private readonly transactionExecutor: TransactionExecutorService,
  ) {}

  /**
   * Create transaction with txId from smart contract nonce
   */
  async createTransaction(dto: CreateTransactionDto, userCommitment: string) {
    await checkAccountMembership(
      this.prisma,
      { accountAddress: dto.accountAddress },
      userCommitment,
    );

    // 1. Validate based on type
    this.validateTransactionDto(dto);

    // 2. Validate nonce is reserved
    const reserved = await this.prisma.reservedNonce.findFirst({
      where: {
        accountAddress: dto.accountAddress,
        nonce: dto.nonce,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reserved) {
      throw new BadRequestException(
        'Nonce not reserved or expired. Please reserve nonce first.',
      );
    }

    // 3. Check account exists and get total signers count
    const account = await this.prisma.account.findUnique({
      where: { address: dto.accountAddress },
      include: { signers: true },
    });

    if (!account) {
      throw new NotFoundException(
        `Account ${dto.accountAddress} not found. Please create account first.`,
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

    // 4. Submit proof to zkVerify (throws on failure)
    const proofResult = await this.zkVerifyService.submitProofAndWaitFinalized(
      {
        proof: dto.proof,
        publicInputs: dto.publicInputs,
        vk: dto.vk,
      },
      'transaction',
      account.chainId,
    );

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
          accountAddress: dto.accountAddress,
          threshold: dto.threshold,
          to: dto.to,
          value: dto.value,
          tokenAddress: dto.tokenAddress,
          contactId: dto.contactId,
          signerData: dto.signers ? JSON.stringify(dto.signers) : null,
          newThreshold: dto.newThreshold,
          createdBy: userCommitment,
          status: 'PENDING',
          batchData,
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
          domainId: getDomainId(account.chainId),
          zkVerifyTxHash: proofResult.txHash,
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

    this.logTransactionAnalytics(
      dto.type,
      dto.userAddress,
      transaction.accountAddress,
      proofResult.txHash,
    );

    // Emit realtime event
    const eventData: TxCreatedEventData = {
      txId: transaction.txId,
      type: transaction.type as TxType,
      accountAddress: transaction.accountAddress,
    };
    this.eventsService.emitToAccount(
      dto.accountAddress,
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
    // 1. Check transaction exists (with account for chainId)
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { account: true },
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

    // 4. Submit proof to zkVerify (throws on failure)
    const proofResult = await this.zkVerifyService.submitProofAndWaitFinalized(
      {
        proof: dto.proof,
        publicInputs: dto.publicInputs,
        vk: dto.vk,
      },
      'transaction',
      transaction.account.chainId,
    );

    const voterName = await this.getSignerDisplayName(
      transaction.accountAddress,
      userCommitment,
    );

    // 5. Create vote
    const vote = await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: userCommitment,
        voteType: VoteType.APPROVE,
        nullifier: dto.nullifier,
        jobId: proofResult.jobId,
        proofStatus: ProofStatus.PENDING,
        domainId: getDomainId(transaction.account.chainId),
        zkVerifyTxHash: proofResult.txHash,
      },
    });

    this.logger.log(`Vote APPROVE added for txId: ${txId}`);

    this.logTransactionAnalytics(
      transaction.type as TxType,
      dto.userAddress,
      transaction.accountAddress,
      proofResult.txHash,
    );

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
        voterName,
        voteType: vote.voteType as VoteType,
        proofStatus: vote.proofStatus as ProofStatus,
      },
    };
    this.eventsService.emitToAccount(
      transaction.accountAddress,
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
  async deny(txId: number, userCommitment: string, userAddress?: string) {
    // 1. Check transaction exists (with account for chainId)
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { account: true },
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

    this.analyticsLogger.logDeny(userAddress, transaction.accountAddress);

    // 4. Check if transaction should fail
    await this.checkIfFailed(txId);

    const updatedTx = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    // Calculate approve count
    const approveCount = await this.prisma.vote.count({
      where: { txId, voteType: VoteType.APPROVE },
    });

    const voterName = await this.getSignerDisplayName(
      transaction.accountAddress,
      userCommitment,
    );

    // Emit realtime event
    const eventData: TxVotedEventData = {
      txId,
      voteType: VoteType.DENY,
      approveCount,
      vote: {
        ...vote,
        voterName,
        voteType: vote.voteType as VoteType,
        proofStatus: vote.proofStatus as ProofStatus,
      },
    };
    this.eventsService.emitToAccount(
      transaction.accountAddress,
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
   * Get transactions for an account with cursor-based pagination
   */
  async getTransactions(
    accountAddress: string,
    userCommitment: string,
    status?: string,
    limit: number = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<PaginatedResponse<any>> {
    if (userCommitment) {
      await checkAccountMembership(
        this.prisma,
        { accountAddress },
        userCommitment,
      );
    }

    const where: any = { accountAddress };
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
        account: {
          include: {
            signers: {
              include: {
                user: {
                  select: { commitment: true },
                },
              },
            },
          },
        },
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
    const rawData = hasMore ? transactions.slice(0, limit) : transactions;

    // Transform data to include voterName in votes
    const data = rawData.map((tx) => {
      // Create map: commitment -> displayName
      const signerMap = new Map(
        tx.account.signers.map((s) => [s.user.commitment, s.displayName]),
      );

      // Parse signerData from JSON string to object
      let parsedSignerData = null;
      if (tx.signerData) {
        try {
          parsedSignerData = JSON.parse(tx.signerData);
        } catch {
          parsedSignerData = null;
        }
      }

      return {
        ...tx,
        votes: tx.votes.map((vote) => ({
          ...vote,
          voterName: signerMap.get(vote.voterCommitment) || null,
        })),
        signerData: parsedSignerData,
        // Remove account.signers from response to reduce payload
        account: undefined,
      };
    });

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
   * Execute transaction on-chain via relayer
   */
  async executeOnChain(txId: number, userAddress?: string) {
    return this.transactionExecutor.executeOnChain(txId, userAddress);
  }

  async reserveNonce(accountAddress: string, userCommitment: string) {
    await checkAccountMembership(
      this.prisma,
      { accountAddress },
      userCommitment,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Clean expired reservations
      await tx.reservedNonce.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      // 2. Find next available nonce
      const maxTxNonce = await tx.transaction.findFirst({
        where: { accountAddress },
        orderBy: { nonce: 'desc' },
        select: { nonce: true },
      });

      const maxReservedNonce = await tx.reservedNonce.findFirst({
        where: { accountAddress },
        orderBy: { nonce: 'desc' },
        select: { nonce: true },
      });

      const nextNonce = Math.max(
        (maxTxNonce?.nonce ?? -1) + 1,
        (maxReservedNonce?.nonce ?? -1) + 1,
      );

      // 3. Reserve (expires 2 min)
      const expiresAt = new Date(Date.now() + NONCE_RESERVATION_TTL);

      await tx.reservedNonce.create({
        data: { accountAddress, nonce: nextNonce, expiresAt },
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
        if (
          !dto.signers ||
          dto.signers.length === 0 ||
          dto.newThreshold === undefined
        ) {
          throw new BadRequestException(
            'Add signer requires "signers" (array of {commitment, name?}) and "newThreshold"',
          );
        }
        if (dto.signers.length > 10) {
          throw new BadRequestException('Maximum 10 signers per transaction');
        }
        break;

      case TxType.REMOVE_SIGNER:
        if (
          !dto.signers ||
          dto.signers.length === 0 ||
          dto.newThreshold === undefined
        ) {
          throw new BadRequestException(
            'Remove signer requires "signers" (array of {commitment, name?}) and "newThreshold"',
          );
        }
        if (dto.signers.length > 10) {
          throw new BadRequestException('Maximum 10 signers per transaction');
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

  /**
   * Check if transaction should be marked as FAILED
   * Query totalSigners realtime from account.signers
   */
  private async checkIfFailed(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: {
        votes: true,
        account: {
          include: { signers: true },
        },
      },
    });

    if (!transaction) return;

    // Get totalSigners realtime
    const totalSigners = transaction.account.signers.length;

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
      this.eventsService.emitToAccount(
        transaction.accountAddress,
        TX_STATUS_EVENT,
        eventData,
      );
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

  private logTransactionAnalytics(
    txType: TxType,
    userAddress: string | undefined,
    accountAddress: string,
    txHash?: string,
  ) {
    this.analyticsLogger.logApprove(userAddress, accountAddress, txHash);

    const logByType: Partial<Record<TxType, () => void>> = {
      [TxType.ADD_SIGNER]: () =>
        this.analyticsLogger.logAddSigner(userAddress, accountAddress, txHash),
      [TxType.REMOVE_SIGNER]: () =>
        this.analyticsLogger.logRemoveSigner(
          userAddress,
          accountAddress,
          txHash,
        ),
      [TxType.SET_THRESHOLD]: () =>
        this.analyticsLogger.logUpdateThreshold(
          userAddress,
          accountAddress,
          txHash,
        ),
      [TxType.TRANSFER]: () =>
        this.analyticsLogger.logTransfer(userAddress, accountAddress, txHash),
      [TxType.BATCH]: () =>
        this.analyticsLogger.logBatchTransfer(
          userAddress,
          accountAddress,
          txHash,
        ),
    };

    logByType[txType]?.();
  }

  private async getSignerDisplayName(
    accountAddress: string,
    commitment: string,
  ): Promise<string | null> {
    const signer = await this.prisma.accountSigner.findFirst({
      where: {
        account: { address: accountAddress },
        user: { commitment },
      },
    });
    return signer?.displayName || null;
  }
}
