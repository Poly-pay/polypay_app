import { Transaction, TxType, VoteType } from "@polypay/shared";
import { BatchTransfer, Member, TransactionRowData, VoteStatus } from "~~/hooks";

export function convertToRowData(tx: Transaction, myCommitment: string): TransactionRowData {
  const members: Member[] = tx.votes.map(vote => ({
    commitment: vote.voterCommitment,
    name: vote.voterName || null,
    isInitiator: vote.voterCommitment === tx.createdBy,
    isMe: vote.voterCommitment === myCommitment,
    voteStatus: vote.voteType === "APPROVE" ? "approved" : "denied",
  }));
  const myVote = tx.votes.find(v => v.voterCommitment === myCommitment);
  const myVoteStatus: VoteStatus | null = myVote
    ? myVote.voteType === VoteType.APPROVE
      ? "approved"
      : "denied"
    : null;

  const approveCount = tx.votes.filter(v => v.voteType === VoteType.APPROVE).length;

  let batchData: BatchTransfer[] | undefined;
  if (tx.batchData) {
    try {
      batchData = typeof tx.batchData === "string" ? JSON.parse(tx.batchData) : tx.batchData;
    } catch {
      batchData = undefined;
    }
  }

  return {
    id: tx.id,
    txId: tx.txId,
    type: tx.type,
    status: tx.status,
    nonce: tx.nonce,
    txHash: tx.txHash || undefined,
    amount: tx.value || undefined,
    recipientAddress: tx.to || undefined,
    tokenAddress: tx.tokenAddress || undefined,
    signerData: tx.signerData || null,
    oldThreshold: tx.threshold,
    newThreshold: tx.newThreshold || undefined,
    batchData,
    members,
    votedCount: tx.votes.length,
    threshold: tx.threshold,
    approveCount,
    myVoteStatus,
    accountAddress: tx.accountAddress,
    contact: tx.contact
      ? {
          id: tx.contact.id,
          name: tx.contact.name,
          address: tx.contact.address,
        }
      : undefined,
  };
}

export function getTxTypeLabel(type: TxType): string {
  switch (type) {
    case TxType.TRANSFER:
      return "Transfer";
    case TxType.ADD_SIGNER:
      return "Add Signer";
    case TxType.REMOVE_SIGNER:
      return "Remove Signer";
    case TxType.SET_THRESHOLD:
      return "Threshold";
    case TxType.BATCH:
      return "Batch";
  }
}

export function getExpandedHeaderText(type: TxType): string {
  switch (type) {
    case TxType.ADD_SIGNER:
      return "Added by";
    case TxType.REMOVE_SIGNER:
      return "Removed by";
    case TxType.SET_THRESHOLD:
      return "Updated by";
    case TxType.TRANSFER:
      return "Created by";
    case TxType.BATCH:
      return "";
    default:
      return "Created by";
  }
}
