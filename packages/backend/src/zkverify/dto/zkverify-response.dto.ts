export interface ZkVerifySubmitResponse {
  jobId: string;
  optimisticVerify: string;
}

export interface ZkVerifyJobStatusResponse {
  status: string;
  jobId: string;
  aggregationId?: string;
  aggregationDetails?: {
    merkleProof: string[];
    numberOfLeaves: number;
    leafIndex: number;
  };
}

export class SubmitProofResponseDto {
  success: boolean;
  data: ZkVerifyJobStatusResponse;
  message?: string;
}