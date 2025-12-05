import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { ProofJobService } from './proof-job.service';
import {
  CreateProofJobDto,
  UpdateAggregationDto,
  ProofJobResponseDto,
  ProofJobsResponseDto,
  AggregationsResponseDto,
} from './dto';
import { JobStatus } from '../generated/prisma/client';

@Controller('proof-jobs')
export class ProofJobController {
  private readonly logger = new Logger(ProofJobController.name);

  constructor(private readonly proofJobService: ProofJobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateProofJobDto): Promise<ProofJobResponseDto> {
    this.logger.log(`Creating proof job for txId: ${createDto.txId}`);
    const proofJob = await this.proofJobService.create(createDto);

    return {
      success: true,
      data: proofJob,
      message: 'Proof job created successfully',
    };
  }

  @Get('by-tx/:txId')
  async findByTxId(@Param('txId', ParseIntPipe) txId: number): Promise<ProofJobsResponseDto> {
    this.logger.log(`Getting proof jobs for txId: ${txId}`);
    const proofJobs = await this.proofJobService.findByTxId(txId);

    return {
      success: true,
      data: proofJobs,
      count: proofJobs.length,
    };
  }

  @Patch(':jobId/status')
  async updateStatus(
    @Param('jobId') jobId: string,
    @Body('status') status: JobStatus,
  ): Promise<ProofJobResponseDto> {
    this.logger.log(`Updating status for job ${jobId} to ${status}`);
    const proofJob = await this.proofJobService.updateStatus(jobId, status);

    return {
      success: true,
      data: proofJob,
      message: 'Status updated successfully',
    };
  }

  @Patch(':jobId/aggregation')
  async updateAggregation(
    @Param('jobId') jobId: string,
    @Body() updateDto: UpdateAggregationDto,
  ): Promise<ProofJobResponseDto> {
    this.logger.log(`Updating aggregation for job ${jobId}`);
    const proofJob = await this.proofJobService.updateAggregation(jobId, updateDto);

    return {
      success: true,
      data: proofJob,
      message: 'Aggregation data updated successfully',
    };
  }

  @Get('aggregations/:txId')
  async getAggregations(@Param('txId', ParseIntPipe) txId: number): Promise<AggregationsResponseDto> {
    this.logger.log(`Getting aggregations for txId: ${txId}`);
    const aggregations = await this.proofJobService.getAggregationsForTx(txId);

    return {
      success: true,
      data: aggregations,
      count: aggregations.length,
    };
  }

  @Get('count/:txId')
  async getAggregatedCount(@Param('txId', ParseIntPipe) txId: number) {
    const count = await this.proofJobService.getAggregatedCount(txId);

    return {
      success: true,
      data: { txId, aggregatedCount: count },
    };
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('jobId') jobId: string) {
    this.logger.log(`Deleting proof job: ${jobId}`);
    await this.proofJobService.delete(jobId);

    return {
      success: true,
      message: 'Proof job deleted successfully',
    };
  }
}
