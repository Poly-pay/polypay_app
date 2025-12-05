import { JobStatus } from '../../generated/prisma/client';

export class ProofJobDto {
  id: string;
  txId: number;
  nullifier: string;
  jobId: string;
  status: JobStatus;
  aggregationId: string | null;
  domainId: number | null;
  merkleProof: string[];
  leafCount: number | null;
  leafIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProofJobResponseDto {
  success: boolean;
  data: ProofJobDto;
  message?: string;
}

export class ProofJobsResponseDto {
  success: boolean;
  data: ProofJobDto[];
  count: number;
}

export class AggregationDataDto {
  nullifier: string;
  aggregationId: string;
  domainId: number;
  merkleProof: string[];
  leafCount: number;
  leafIndex: number;
}

export class AggregationsResponseDto {
  success: boolean;
  data: AggregationDataDto[];
  count: number;
}