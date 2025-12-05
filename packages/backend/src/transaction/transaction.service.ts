import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TxStatus, JobStatus } from '../generated/prisma/client';
import { CreateTransactionDto, TransactionDto } from './dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateTransactionDto): Promise<TransactionDto> {
    const { txId, to, value, callData, signaturesRequired } = createDto;

    const existing = await this.prisma.transaction.findUnique({
      where: { txId },
    });

    if (existing) {
      throw new ConflictException(`Transaction ${txId} already exists`);
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        txId,
        to,
        value,
        callData,
        signaturesRequired,
        status: TxStatus.PENDING,
      },
    });

    this.logger.log(`Created transaction: ${txId}`);
    return transaction;
  }

  async findByTxId(txId: number): Promise<TransactionDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: {
        proofJobs: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    return {
      ...transaction,
      signatureCount: transaction.proofJobs.length,
    };
  }

  async findAll(status?: TxStatus): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: status ? { status } : undefined,
      include: {
        proofJobs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((tx) => ({
      ...tx,
      signatureCount: tx.proofJobs.length,
    }));
  }

  async findPending(): Promise<TransactionDto[]> {
    return this.findAll(TxStatus.PENDING);
  }

  async findReady(): Promise<TransactionDto[]> {
    return this.findAll(TxStatus.READY);
  }

  async updateStatus(txId: number, status: TxStatus): Promise<TransactionDto> {
    await this.findByTxId(txId);

    const updated = await this.prisma.transaction.update({
      where: { txId },
      data: {
        status,
        executedAt: status === TxStatus.EXECUTED ? new Date() : undefined,
      },
      include: {
        proofJobs: true,
      },
    });

    this.logger.log(`Updated transaction ${txId} status to ${status}`);
    return updated;
  }

  async checkAndUpdateReady(txId: number): Promise<TransactionDto> {
    const transaction = await this.findByTxId(txId);

    const aggregatedCount = await this.prisma.proofJob.count({
      where: {
        txId,
        status: JobStatus.AGGREGATED,
      },
    });

    if (aggregatedCount >= transaction.signaturesRequired) {
      return this.updateStatus(txId, TxStatus.READY);
    }

    return transaction;
  }

  async markExecuted(txId: number): Promise<TransactionDto> {
    return this.updateStatus(txId, TxStatus.EXECUTED);
  }
}
