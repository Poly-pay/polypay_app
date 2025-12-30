import { TxType, TxStatus, VoteType } from "../enums";
import { Vote } from "./vote";

export interface TxCreatedEventData {
  txId: number;
  type: TxType;
  walletAddress: string;
}

export interface TxStatusEventData {
  txId: number;
  status: TxStatus;
  txHash?: string;
}

export interface TxVotedEventData {
  txId: number;
  voteType: VoteType;
  approveCount: number;
  vote: Vote;
}
