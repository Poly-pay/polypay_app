import { TxType, TxStatus } from "../enums";
import { Contact } from "./contact-book";
import { Vote } from "./vote";

export interface Transaction {
  id: string;
  txId: number;
  type: TxType;
  status: TxStatus;
  nonce: number;
  to?: string;
  value?: string;
  tokenAddress?: string;
  contactId?: string;
  contact?: Contact;
  accountAddress: string;
  signerCommitments?: string[];
  newThreshold?: number;
  batchData?: string;
  createdBy: string;
  threshold: number;
  txHash?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
  votes: Vote[];
}
