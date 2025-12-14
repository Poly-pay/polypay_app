import { VoteType, ProofStatus } from "../enums";

export interface Vote {
  id: string;
  txId: number;
  voterCommitment: string;
  voteType: VoteType;
  nullifier?: string;
  proofStatus?: ProofStatus;
  jobId?: string;
  aggregationId?: string;
  domainId?: number;
  merkleProof: string[];
  leafCount?: number;
  leafIndex?: number;
  createdAt: string;
  updatedAt: string;
}
