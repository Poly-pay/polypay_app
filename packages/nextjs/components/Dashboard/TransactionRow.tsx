"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Transaction, TxStatus, TxType, VoteType, horizenTestnet } from "@polypay/shared";
import { getTokenByAddress } from "@polypay/shared";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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

function AddressWithContact({
  address,
  contactName,
  className,
}: {
  address: string;
  contactName?: string;
  className?: string;
}) {
  if (contactName) {
    return (
      <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
        <span className="font-medium">{contactName}</span>
        <span className="text-main-black ml-1">({formatAddress(address, { start: 3, end: 3 })})</span>
      </span>
    );
  }
  return (
    <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
      {formatAddress(address, { start: 3, end: 3 })}
    </span>
  );
}

// ============ Vote Badge Component ============
function VoteBadge({ status }: { status: VoteStatus | "waiting" }) {
  if (status === "approved") {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-lime-50 rounded-md tracking-tight">
        Approved
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-red-25 rounded-md tracking-tight">
        Denied
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-blue-50 rounded-md tracking-tight">
      Waiting for confirm...
    </span>
  );
}

function AwaitingBadge() {
  return (
    <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-blue-50 rounded-md tracking-tight">
      Awaiting
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
        className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-grey-900 bg-lime-50 rounded-md tracking-tight hover:opacity-80 transition-opacity"
      >
        Succeed
        <ExternalLink size={14} />
      </a>
    );
  }
  if (status === TxStatus.FAILED) {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-grey-900 bg-red-25 rounded-md tracking-tight">
        Denied
      </span>
    );
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
        className="w-[90px] py-1 px-3 text-sm font-medium text-white bg-main-black rounded-lg cursor-pointer disabled:opacity-50"
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
        className="px-6 py-2 text-sm font-medium text-main-black bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        Deny
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onApprove();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-main-black bg-pink-350 rounded-full hover:bg-pink-450 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}

// ============ Transaction Display Components ============
interface TxHeaderProps {
  tx: TransactionRowData;
  myVoteStatus: VoteStatus | null;
  onApprove: () => void;
  onDeny: () => void;
  loading: boolean;
  initiatorName?: string;
  initiatorCommitment: string;
}

function TxHeader({
  tx,
  myVoteStatus,
  onApprove,
  onDeny,
  loading,
  initiatorCommitment,
  initiatorName,
}: TxHeaderProps & { initiatorCommitment?: string }) {
  const headerText = getExpandedHeaderText(tx.type);
  const shortCommitment = formatAddress(initiatorCommitment, { start: 4, end: 4 });

  const renderHeaderRow = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="text-lg font-semibold">
        {tx.type === TxType.BATCH ? (
          <span>{tx.batchData?.length ?? 0} transactions</span>
        ) : (
          <span>
            {headerText} {initiatorName ? `${initiatorName} (${shortCommitment})` : shortCommitment}
          </span>
        )}
      </div>
      {myVoteStatus === null && (
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              onDeny();
            }}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-main-black bg-white rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Deny
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onApprove();
            }}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-main-black bg-pink-350 rounded-full hover:bg-pink-450 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : "Approve"}
          </button>
        </div>
      )}
    </div>
  );

  if (tx.type === TxType.TRANSFER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-4" key={tx.type}>
          <span className="mr-10">Tranfer</span>
          <Image
            src={getTokenByAddress(tx.tokenAddress).icon}
            alt={getTokenByAddress(tx.tokenAddress).symbol}
            width={20}
            height={20}
          />
          <span>{formatAmount(tx.amount ?? "0", tx.tokenAddress)}</span>
          <Image src="/icons/arrows/arrow-right-long-white.svg" alt="Arrow Right" width={100} height={100} />
          <AddressWithContact address={tx.recipientAddress ?? ""} contactName={tx.contact?.name} className="bg-white" />
        </div>
      </div>
    );
  }

  if (tx.type === TxType.ADD_SIGNER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-2 flex-wrap">
          {tx.signerData?.map((signer, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-[12px] bg-white text-main-black px-3 py-1.5 rounded-full"
            >
              <Image src="/avatars/signer-3.svg" alt="Signer" width={16} height={16} className="rounded-full" />
              <span>
                {signer.name
                  ? `${signer.name} (${formatAddress(signer.commitment, { start: 4, end: 4 })})`
                  : formatAddress(signer.commitment, { start: 4, end: 4 })}
              </span>
            </div>
          ))}
        </div>
        {/* Threshold update */}
        {tx.newThreshold && tx.newThreshold !== tx.threshold && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-white/80">Threshold update:</span>
            <span className="text-sm text-white font-medium">{String(tx.oldThreshold).padStart(2, "0")}</span>
            <Image src="/icons/arrows/arrow-right-long-pink.svg" alt="Arrow Right" width={100} height={100} />
            <span className="text-sm text-white font-medium">{String(tx.newThreshold).padStart(2, "0")}</span>
          </div>
        )}
      </div>
    );
  }

  if (tx.type === TxType.REMOVE_SIGNER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-2 flex-wrap">
          {tx.signerData?.map((signer, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-[12px] bg-white text-main-black px-3 py-1.5 rounded-full"
            >
              <Image src="/avatars/signer-3.svg" alt="Signer" width={16} height={16} className="rounded-full" />
              <span>
                {signer.name
                  ? `${signer.name} (${formatAddress(signer.commitment, { start: 4, end: 4 })})`
                  : formatAddress(signer.commitment, { start: 4, end: 4 })}
              </span>
            </div>
          ))}
        </div>
        {/* Threshold update */}
        {tx.newThreshold && tx.newThreshold !== tx.threshold && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-white/80">Threshold update:</span>
            <span className="text-sm text-white font-medium">{String(tx.oldThreshold).padStart(2, "0")}</span>
            <Image src="/icons/arrows/arrow-right-long-pink.svg" alt="Arrow Right" width={100} height={100} />
            <span className="text-sm text-white font-medium">{String(tx.newThreshold).padStart(2, "0")}</span>
          </div>
        )}
      </div>
    );
  }

  if (tx.type === TxType.SET_THRESHOLD) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-3">
          <span className="text-sm text-white font-medium">New Threshold</span>
          <span className="text-sm text-white font-medium">{String(tx.oldThreshold).padStart(2, "0")}</span>
          <Image src="/icons/arrows/arrow-right-long-pink.svg" alt="Arrow Right" width={100} height={100} />
          <span className="text-sm text-white font-medium">{String(tx.newThreshold).padStart(2, "0")}</span>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.BATCH && tx.batchData) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {tx.batchData.map((transfer, index) => (
            <div className="flex items-center gap-4" key={tx.type + index}>
              <span className="mr-10">Tranfer</span>
              <Image
                src={getTokenByAddress(transfer.tokenAddress).icon}
                alt={getTokenByAddress(transfer.tokenAddress).symbol}
                width={20}
                height={20}
              />
              <span>{formatAmount(transfer.amount ?? "0", transfer.tokenAddress)}</span>
              <Image src="/icons/arrows/arrow-right-long-white.svg" alt="Arrow Right" width={100} height={100} />
              <AddressWithContact
                address={transfer.recipient ?? ""}
                contactName={transfer.contactName}
                className="bg-white"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

interface SignerWithStatus {
  commitment: string;
  name?: string | null;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus | "waiting";
}

function SignerList({
  members,
  allSigners,
  votedCount,
  threshold,
  totalSigners,
  myCommitment,
  initiatorCommitment,
  txStatus,
}: {
  members: Member[];
  allSigners: string[];
  votedCount: number;
  threshold: number;
  totalSigners: number;
  myCommitment: string;
  initiatorCommitment: string;
  txStatus: TxStatus;
}) {
  // If tx is executed or failed, only show voters from members
  // Otherwise, merge allSigners with vote status
  const signersWithStatus: SignerWithStatus[] =
    txStatus === TxStatus.EXECUTED || txStatus === TxStatus.FAILED
      ? members.map(member => ({
          commitment: member.commitment,
          name: member.name || null,
          isInitiator: member.commitment === initiatorCommitment,
          isMe: member.commitment === myCommitment,
          voteStatus: member.voteStatus,
        }))
      : allSigners.map(commitment => {
          const voted = members.find(m => m.commitment === commitment);
          return {
            commitment,
            name: voted?.name || null,
            isInitiator: commitment === initiatorCommitment,
            isMe: commitment === myCommitment,
            voteStatus: voted?.voteStatus || "waiting",
          };
        });

  return (
    <div className="flex flex-col p-4 gap-2 border border-grey-200 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-grey-900 tracking-tight">Signers</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-grey-400 tracking-tight">
            Voted{" "}
            <span className="text-grey-800 font-medium">
              {votedCount}/{totalSigners}
            </span>
          </span>
          <span className="text-grey-400 tracking-tight">
            Threshold{" "}
            <span className="text-grey-800 font-medium">
              {threshold}/{totalSigners}
            </span>
          </span>
        </div>
      </div>

      {/* Signer Rows */}
      <div className="flex flex-col gap-0.5">
        {signersWithStatus.map((signer, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-grey-800 tracking-tight">
                {signer.name ? (
                  <>
                    {signer.name} ({formatAddress(signer.commitment, { start: 4, end: 4 })})
                  </>
                ) : (
                  formatAddress(signer.commitment, { start: 4, end: 4 })
                )}
              </span>
              {signer.isMe && <span className="text-sm font-medium text-pink-350 tracking-tight">[you]</span>}
              {signer.isInitiator && (
                <span className="text-sm font-medium text-[#066EFF] tracking-tight">[Transaction Initiator]</span>
              )}
            </div>
            <VoteBadge status={signer.voteStatus} />
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

// Get header text for expanded content based on tx type
function getExpandedHeaderText(type: TxType): string {
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
          <Image src="/icons/arrows/arrow-right-long-purple.svg" alt="Arrow Right" width={100} height={100} />
          <AddressWithContact address={tx.recipientAddress ?? ""} contactName={tx.contact?.name} />
        </div>
      );

    case TxType.ADD_SIGNER:
    case TxType.REMOVE_SIGNER:
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {tx.signerData?.map((signer, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <Image src="/avatars/signer-3.svg" alt="Signer" width={16} height={16} className="rounded-full" />
              <span className="text-[12px]">
                {signer.name ? (
                  <>
                    {signer.name} ({formatAddress(signer.commitment, { start: 4, end: 4 })})
                  </>
                ) : (
                  formatAddress(signer.commitment, { start: 4, end: 4 })
                )}
              </span>
            </div>
          ))}
        </div>
      );

    case TxType.SET_THRESHOLD:
      return (
        <div className="flex items-center gap-3">
          <span className="text-gray-950">{String(tx.oldThreshold).padStart(2, "0")}</span>
          <Image src="/icons/arrows/arrow-right-long-purple.svg" alt="Arrow Right" width={100} height={100} />
          <span className="text-gray-950">{String(tx.newThreshold).padStart(2, "0")}</span>
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
    // Executed or Failed
    if (tx.status === TxStatus.EXECUTED || tx.status === TxStatus.FAILED) {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

    // Can execute
    if (isExecutable || tx.status === TxStatus.EXECUTING) {
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

    // Not voted yet - show action buttons
    if (tx.myVoteStatus === null) {
      // Expanded → show Awaiting (buttons are in TxHeader)
      if (expanded) {
        return <AwaitingBadge />;
      }
      // Collapsed → show action buttons
      return (
        <ActionButtons
          onApprove={handleApprove}
          onDeny={handleDeny}
          onExecute={() => handleExecute(tx.txId)}
          loading={loading}
          isExecutable={false}
          isExecuting={false}
        />
      );
    }

    // Voted but waiting for others
    return <AwaitingBadge />;
  };

  // Get initiator name for header
  const initiator = tx.members.find(m => m.isInitiator);
  const initiatorName = initiator
    ? initiator.name || formatAddress(initiator.commitment, { start: 4, end: 4 })
    : "Unknown";
  const initiatorCommitment = tx.members.find(m => m.isInitiator)?.commitment || "";

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

      {/* Main Container */}
      <div
        className={`flex flex-col p-6 gap-3 bg-white border border-grey-200 rounded-xl ${!expanded ? "pb-0 pt-3" : "pt-3"}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Collapsed Row */}
        <div
          className={`flex items-center justify-between pb-3 border-grey-200 cursor-pointer ${expanded ? "border-b" : ""}`}
        >
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown size={18} className="text-grey-600 border border-grey-200 rounded-full p-0.5" />
            ) : (
              <ChevronRight size={18} className="text-grey-600 border border-grey-200 rounded-full p-0.5" />
            )}
            <span className="text-sm font-medium text-grey-500 tracking-tight">{getTxTypeLabel(tx.type)}</span>
            {!expanded && <TxDetails tx={tx} />}
          </div>
          <div onClick={e => e.stopPropagation()}>{renderRightSide()}</div>
        </div>

        {/* Expanded Content */}
        {shouldRender && (
          <div
            className={`flex flex-col gap-3 overflow-hidden ${expanded ? "animate-expand" : "animate-collapse"}`}
            onAnimationEnd={handleAnimationEnd}
          >
            <TxHeader
              tx={tx}
              myVoteStatus={tx.myVoteStatus}
              onApprove={handleApprove}
              onDeny={handleDeny}
              loading={loading}
              initiatorCommitment={initiatorCommitment}
              initiatorName={initiatorName}
            />
            <SignerList
              members={tx.members}
              allSigners={commitmentsData?.map(item => item?.toString()) || []}
              votedCount={tx.votedCount}
              threshold={
                tx.status === TxStatus.EXECUTED || tx.status === TxStatus.FAILED
                  ? tx.approveCount
                  : Number(walletThreshold) || 0
              }
              totalSigners={totalSigners}
              myCommitment={tx.members.find(m => m.isMe)?.commitment || ""}
              initiatorCommitment={initiatorCommitment}
              txStatus={tx.status}
            />
          </div>
        )}
      </div>
    </div>
  );
}
