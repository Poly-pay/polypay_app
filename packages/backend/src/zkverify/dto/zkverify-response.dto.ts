export interface ZkVerifySubmitResponse {
  jobId: string;
  optimisticVerify: string;
}

export interface ZkVerifyJobStatusResponse {
  jobId: string;
  status: string;
  proofType: string;
  chainId: number;
  createdAt: string;
  updatedAt: string;
  proofOptions: Record<string, any>;
  txHash?: string;
  txExplorerUrl?: string;
  blockHash?: string;
  blockExplorerUrl?: string;
  aggregationId?: number;
  statement?: string;
  aggregationDetails?: {
    receipt: string;
    receiptBlockHash: string;
    root: string;
    leaf: string;
    leafIndex: number;
    numberOfLeaves: number;
    merkleProof: string[];
  };
}
export class SubmitProofResponseDto {
  success: boolean;
  data: ZkVerifyJobStatusResponse;
  message?: string;
}
