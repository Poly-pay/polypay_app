import { TxStatus } from '../../generated/prisma/client';
import { ProofJob } from '../../generated/prisma/client';

export class TransactionDto {
  id: string;
  txId: number;
  to: string;
  value: string;
  callData: string | null;
  signaturesRequired: number;
  status: TxStatus;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  proofJobs?: ProofJob[];
  signatureCount?: number;
}

export class TransactionResponseDto {
  success: boolean;
  data: TransactionDto;
  message?: string;
}

export class TransactionsResponseDto {
  success: boolean;
  data: TransactionDto[];
  count: number;
}