"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Transaction, TxStatus, TxType, VoteType, horizenTestnet } from "@polypay/shared";
import { getTokenByAddress } from "@polypay/shared";
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  BatchTransfer,
  Member,
  TransactionRowData,
  VoteStatus,
  useTransactionVote,
  useWalletCommitments,
  useWalletThreshold,
} from "~~/hooks";
import { formatAddress, formatAmount } from "~~/utils/format";

// ============ Helper: Convert API Transaction to Row Data ============
export function convertToRowData(tx: Transaction, myCommitment: string): TransactionRowData {
  const members: Member[] = tx.votes.map(vote => ({
    commitment: vote.voterCommitment,
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

  // Calculate approve count
  const approveCount = tx.votes.filter(v => v.voteType === "APPROVE").length;

  // Parse batchData if exists
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
    signerCommitments: tx.signerCommitments || [],
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

function AddressWithContact({ address, contactName }: { address: string; contactName?: string }) {
  if (contactName) {
    return (
      <span className="text-sm text-grey-1000 bg-grey-100 px-5 py-1 rounded-3xl">
        <span className="font-medium">{contactName}</span>
        <span className="text-gray-500 ml-1">({formatAddress(address)})</span>
      </span>
    );
  }
  return <span className="text-sm text-grey-1000 bg-grey-100 px-5 py-1 rounded-3xl">{formatAddress(address)}</span>;
}

// ============ Vote Badge Component ============
function VoteBadge({ status }: { status: VoteStatus }) {
  if (status === "approved") {
    return <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">Approved</span>;
  }
  if (status === "denied") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Denied</span>;
  }
  return (
    <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-full">
      Waiting for confirm...
    </span>
  );
}

// ============ Status Badge Component ============
function StatusBadge({ status, txHash }: { status: TxStatus; txHash?: string }) {
  if (status === TxStatus.EXECUTED) {
    return (
      <a
        href={txHash ? `${horizenTestnet.blockExplorers.default.url}/tx/${txHash}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
      >
        Succeed
        <ExternalLink size={14} />
      </a>
    );
  }
  if (status === TxStatus.FAILED) {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Failed</span>;
  }
  return null;
}

// ============ Action Buttons Component ============
function ActionButtons({
  onApprove,
  onDeny,
  onExecute,
  loading,
  isExecutable,
  isExecuting,
}: {
  onApprove: () => void;
  onDeny: () => void;
  onExecute: () => void;
  loading: boolean;
  isExecutable: boolean;
  isExecuting: boolean;
}) {
  if (isExecutable || isExecuting) {
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          onExecute();
        }}
        disabled={loading || isExecuting}
        className="px-6 py-2 text-sm font-medium text-blue-700 bg-blue-200 rounded-full hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading || isExecuting ? "Executing..." : "Execute"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={e => {
          e.stopPropagation();
          onDeny();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        Deny
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onApprove();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-white bg-pink-350 rounded-full hover:bg-pink-450 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}

// ============ Transaction Display Components ============
function TxHeader({ tx }: { tx: TransactionRowData }) {
  if (tx.type === TxType.TRANSFER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Transfer</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Image
              src={getTokenByAddress(tx.tokenAddress).icon}
              alt={getTokenByAddress(tx.tokenAddress).symbol}
              width={20}
              height={20}
            />
            <span>{formatAmount(tx.amount ?? "0", tx.tokenAddress)}</span>
          </div>
          <ArrowRight size={20} />
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            {tx.contact?.name ? (
              <>
                <span className="font-medium">{tx.contact.name}</span>
                <span className="text-white/70">({formatAddress(tx.recipientAddress ?? "")})</span>
              </>
            ) : (
              <span>{tx.recipientAddress}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.ADD_SIGNER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-4">Add Signer</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-grey-1000 bg-grey-100 px-5 py-1 rounded-3xl">
            {tx.signerCommitments?.[0].slice(0, 10)}...{tx.signerCommitments?.[0].slice(-8)}
          </span>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.REMOVE_SIGNER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Remove Signer</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-grey-1000 bg-grey-100 px-5 py-1 rounded-3xl">
            {tx.signerCommitments?.[0].slice(0, 10)}...{tx.signerCommitments?.[0].slice(-8)}
          </span>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.SET_THRESHOLD) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Set Threshold</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{tx.oldThreshold}</span>
          <ArrowRight size={20} />
          <span className="text-2xl font-bold">{tx.newThreshold}</span>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.BATCH && tx.batchData) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Batch Transfer</h3>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
            <span>{tx.batchData.length} transfers</span>
          </div>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {tx.batchData.map((transfer, index) => (
            <div key={index} className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg">
              <span className="text-white/60 text-sm w-6">#{index + 1}</span>
              <div className="flex items-center gap-2">
                <Image
                  src={getTokenByAddress(transfer.tokenAddress).icon}
                  alt={getTokenByAddress(transfer.tokenAddress).symbol}
                  width={16}
                  height={16}
                />
                <span className="font-medium">{formatAmount(transfer.amount, transfer.tokenAddress)}</span>
              </div>
              <ArrowRight size={16} className="text-white/60" />
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {transfer.contactName ? (
                  <>
                    <span className="font-medium">{transfer.contactName}</span>
                    <span className="text-white/70 ml-1">({formatAddress(transfer.recipient)})</span>
                  </>
                ) : (
                  formatAddress(transfer.recipient)
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function MemberList({
  members,
  votedCount,
  threshold,
  totalSigners,
}: {
  members: Member[];
  votedCount: number;
  threshold: number;
  totalSigners: number;
}) {
  return (
    <div className="bg-white border border-t-0 rounded-b-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-gray-800">Members</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Voted{" "}
            <span className="font-medium">
              {votedCount}/{totalSigners}
            </span>
          </span>
          <span>
            Threshold{" "}
            <span className="font-medium">
              {threshold}/{totalSigners}
            </span>
          </span>
        </div>
      </div>

      {/* Member Rows */}
      <div className="divide-y">
        {members.map((member, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 font-mono text-sm">
                {member.commitment.slice(0, 8)}...{member.commitment.slice(-6)}
              </span>
              {member.isInitiator && <span className="text-sm text-blue-600">[Initiator]</span>}
              {member.isMe && <span className="text-sm text-orange-500">[me]</span>}
            </div>
            <VoteBadge status={member.voteStatus} />
          </div>
        ))}
      </div>
    </div>
  );
}

function getTxTypeLabel(type: TxType): string {
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

function TxDetails({ tx }: { tx: TransactionRowData }) {
  switch (tx.type) {
    case TxType.TRANSFER:
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src={getTokenByAddress(tx.tokenAddress).icon}
              alt={getTokenByAddress(tx.tokenAddress).symbol}
              width={20}
              height={20}
            />
            <span className="font-medium">{formatAmount(tx.amount ?? "0", tx.tokenAddress)}</span>
          </div>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <AddressWithContact address={tx.recipientAddress ?? ""} contactName={tx.contact?.name} />
        </div>
      );

    case TxType.ADD_SIGNER:
    case TxType.REMOVE_SIGNER:
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-grey-1000 bg-grey-100 px-5 py-1 rounded-3xl">
            {tx.signerCommitments?.[0].slice(0, 8)}...{tx.signerCommitments?.[0].slice(-6)}
          </span>
        </div>
      );

    case TxType.SET_THRESHOLD:
      return (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{tx.oldThreshold}</span>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <span className="font-semibold text-gray-800">{tx.newThreshold}</span>
        </div>
      );

    case TxType.BATCH:
      if (!tx.batchData || tx.batchData.length === 0) {
        return <span className="text-gray-500">No transfers</span>;
      }
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm text-grey-1000 bg-grey-100 px-3 py-1 rounded-3xl">
            {tx.batchData.length} transfer{tx.batchData.length > 1 ? "s" : ""}
          </span>
        </div>
      );
  }
}

// ============ Main Component ============
interface TransactionRowProps {
  tx: TransactionRowData;
  onSuccess?: () => void;
}

export function TransactionRow({ tx, onSuccess }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isExecutable, setIsExecutable] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const { data: walletThreshold } = useWalletThreshold();
  const { data: commitmentsData } = useWalletCommitments();

  // Get totalSigners realtime from wallet commitments
  const totalSigners = commitmentsData?.length || 0;

  useEffect(() => {
    if (expanded) {
      setShouldRender(true);
    }
  }, [expanded]);

  const handleAnimationEnd = () => {
    if (!expanded) {
      setShouldRender(false);
    }
  };

  const { approve, deny, execute, isLoading: loading, loadingState } = useTransactionVote({ onSuccess });

  const handleApprove = async () => {
    await approve(tx);
  };

  const handleDeny = async () => {
    await deny(tx);
  };

  const handleExecute = async (txId: number) => {
    await execute(txId);
  };

  const renderRightSide = () => {
    if (tx.status === TxStatus.EXECUTED || tx.status === TxStatus.FAILED) {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

    if (tx.myVoteStatus === null || isExecutable || tx.status === TxStatus.EXECUTING) {
      return (
        <ActionButtons
          onApprove={handleApprove}
          onDeny={handleDeny}
          onExecute={() => handleExecute(tx.txId)}
          loading={loading}
          isExecutable={isExecutable && tx.status !== TxStatus.EXECUTING}
          isExecuting={tx.status === TxStatus.EXECUTING}
        />
      );
    }

    return <VoteBadge status={tx.myVoteStatus} />;
  };

  useEffect(() => {
    const checkExecutable = async () => {
      if (tx.status !== TxStatus.PENDING) {
        setIsExecutable(false);
        return;
      }

      try {
        setIsExecutable(tx.approveCount >= Number(walletThreshold));
      } catch (error) {
        console.error("Failed to check threshold:", error);
        setIsExecutable(false);
      }
    };

    checkExecutable();
  }, [tx.status, tx.approveCount, walletThreshold]);

  return (
    <div className="w-full mb-2">
      {/* Loading State */}
      {loading && loadingState && (
        <div className="mb-1 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">{loadingState}</div>
      )}

      {/* Collapsed Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {expanded ? (
            <ChevronDown size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          ) : (
            <ChevronRight size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          )}
          <span className="font-medium text-grey-600 min-w-[100px]">{getTxTypeLabel(tx.type)}</span>
          <TxDetails tx={tx} />
        </div>
        <div onClick={e => e.stopPropagation()}>{renderRightSide()}</div>
      </div>

      {/* Expanded Content */}
      {shouldRender && (
        <div
          className={`overflow-hidden ${expanded ? "animate-expand" : "animate-collapse"} mt-1`}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className="mx-2">
            <TxHeader tx={tx} />
            <MemberList
              members={tx.members}
              votedCount={tx.votedCount}
              threshold={Number(walletThreshold)}
              totalSigners={totalSigners}
            />
          </div>
        </div>
      )}
    </div>
  );
}
