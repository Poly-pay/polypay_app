import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JobStatus } from '../generated/prisma/client';
import {
  CreateProofJobDto,
  UpdateAggregationDto,
  ProofJobDto,
  AggregationDataDto,
} from './dto';

@Injectable()
export class ProofJobService {
  private readonly logger = new Logger(ProofJobService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProofJobDto): Promise<ProofJobDto> {
    const { txId, nullifier, jobId } = createDto;

    try {
      const existingByNullifier = await this.prisma.proofJob.findUnique({
        where: { nullifier },
      });

      if (existingByNullifier) {
        throw new ConflictException('Nullifier already used');
      }

      const existingByJobId = await this.prisma.proofJob.findUnique({
        where: { jobId },
      });

      if (existingByJobId) {
        throw new ConflictException('Job ID already exists');
      }

      const proofJob = await this.prisma.proofJob.create({
        data: {
          txId,
          nullifier,
          jobId,
          status: JobStatus.PENDING,
        },
      });

      this.logger.log(`Created proof job: ${proofJob.id} for txId: ${txId}`);
      return proofJob;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create proof job', error);
      throw new BadRequestException(`Failed to create proof job: ${error.message}`);
    }
  }

  async findByJobId(jobId: string): Promise<ProofJobDto> {
    const proofJob = await this.prisma.proofJob.findUnique({
      where: { jobId },
    });

    if (!proofJob) {
      throw new NotFoundException(`Proof job with jobId ${jobId} not found`);
    }

    return proofJob;
  }

  async findByTxId(txId: number): Promise<ProofJobDto[]> {
    return this.prisma.proofJob.findMany({
      where: { txId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(jobId: string, status: JobStatus): Promise<ProofJobDto> {
    try {
      await this.findByJobId(jobId);

      const updated = await this.prisma.proofJob.update({
        where: { jobId },
        data: { status },
      });

      this.logger.log(`Updated proof job ${jobId} status to ${status}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update status for job ${jobId}`, error);
      throw new BadRequestException(`Failed to update status: ${error.message}`);
    }
  }

  async updateAggregation(jobId: string, updateDto: UpdateAggregationDto): Promise<ProofJobDto> {
    const { aggregationId, merkleProof, leafCount, leafIndex } = updateDto;

    try {
      await this.findByJobId(jobId);

      const updated = await this.prisma.proofJob.update({
        where: { jobId },
        data: {
          aggregationId,
          merkleProof,
          leafCount,
          leafIndex,
          status: JobStatus.AGGREGATED,
        },
      });

      this.logger.log(`Updated aggregation data for job ${jobId}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update aggregation for job ${jobId}`, error);
      throw new BadRequestException(`Failed to update aggregation: ${error.message}`);
    }
  }

  async getAggregationsForTx(txId: number): Promise<AggregationDataDto[]> {
    const proofJobs = await this.prisma.proofJob.findMany({
      where: {
        txId,
        status: JobStatus.AGGREGATED,
      },
      orderBy: { createdAt: 'asc' },
    });

    return proofJobs.map((job) => ({
      nullifier: job.nullifier,
      aggregationId: job.aggregationId!,
      domainId: job.domainId ?? 0,
      merkleProof: job.merkleProof,
      leafCount: job.leafCount!,
      leafIndex: job.leafIndex!,
    }));
  }

  async getAggregatedCount(txId: number): Promise<number> {
    return this.prisma.proofJob.count({
      where: {
        txId,
        status: JobStatus.AGGREGATED,
      },
    });
  }

  async delete(jobId: string): Promise<void> {
    try {
      await this.findByJobId(jobId);
      await this.prisma.proofJob.delete({
        where: { jobId },
      });
      this.logger.log(`Deleted proof job ${jobId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete job ${jobId}`, error);
      throw new BadRequestException(`Failed to delete proof job: ${error.message}`);
    }
  }
}
