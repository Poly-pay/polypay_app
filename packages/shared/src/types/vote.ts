import { VoteType, ProofStatus } from "../enums";

export interface Vote {
  id: string;
  txId: number;
  voterCommitment: string;
  voterName: string | null;
  voteType: VoteType;
  nullifier?: string;
  proofStatus?: ProofStatus;
  jobId?: string;
  aggregationId?: string;
  domainId?: number;
  merkleProof: string[];
  leafCount?: number;
  leafIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}
