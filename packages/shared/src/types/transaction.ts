import { TxType, TxStatus } from "../enums";
import { Contact } from "./address-book";
import { Vote } from "./vote";

export interface Transaction {
  id: string;
  txId: number;
  type: TxType;
  status: TxStatus;
  nonce: number;
  to?: string;
  value?: string;
  contactId?: string;
  contact?: Contact;
  walletAddress: string;
  signerCommitment?: string;
  newThreshold?: number;
  batchData?: string;
  createdBy: string;
  threshold: number;
  totalSigners: number;
  txHash?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
  votes: Vote[];
}
