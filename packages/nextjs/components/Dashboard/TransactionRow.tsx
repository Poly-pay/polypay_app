// components/transaction/TransactionRow.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink, Minus, Plus, Settings } from "lucide-react";

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// components/transaction/TransactionRow.tsx

// ============ Types ============
type TxType = "transfer" | "add_signer" | "remove_signer" | "set_threshold";
type VoteStatus = "approved" | "denied" | "waiting";
type TxStatus = "pending" | "executed" | "failed";

interface Member {
  address: string;
  name: string;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus;
}

interface TransactionRowData {
  id: string;
  type: TxType;
  status: TxStatus;
  txHash?: string;

  // Transfer
  amount?: string;
  recipientName?: string;
  recipientAddress?: string;

  // Add/Remove Signer
  signerAddresses?: string[];
  signerName?: string;
  actionByName?: string;

  // Set Threshold
  oldThreshold?: number;
  newThreshold?: number;

  // Voting
  members: Member[];
  votedCount: number;
  threshold: number;

  // Current user vote
  myVoteStatus: VoteStatus | null; // null = chưa vote
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
  if (status === "executed") {
    return (
      <a
        href={txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
      >
        Succeed
        <ExternalLink size={14} />
      </a>
    );
  }

  if (status === "failed") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Failed</span>;
  }

  return null;
}

// ============ Action Buttons Component ============
function ActionButtons({ onApprove, onDeny }: { onApprove: () => void; onDeny: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={e => {
          e.stopPropagation();
          onDeny();
        }}
        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
      >
        Deny
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onApprove();
        }}
        className="px-6 py-2 text-sm font-medium text-white bg-[#FF7CEB] rounded-full hover:bg-[#f35ddd] transition-colors cursor-pointer"
      >
        Approve
      </button>
    </div>
  );
}

// ============ Transaction Header (Purple) Component ============
function TxHeader({ tx }: { tx: TransactionRowData }) {
  if (tx.type === "transfer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Transfer</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Image src="/token/eth.svg" alt="ETH" width={20} height={20} />
            <span>{tx.amount} ETH</span>
          </div>
          <ArrowRight size={20} />
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <span>{tx.recipientAddress}</span>
          </div>
        </div>
      </div>
    );
  }

  if (tx.type === "add_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-4">Added by {tx.actionByName}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {tx.signerAddresses?.map((addr, i) => (
            <span key={i} className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
              {addr}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (tx.type === "remove_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Removed by {tx.actionByName}</h3>
        <div className="flex items-center gap-2">
          {tx.signerAddresses?.map((addr, i) => (
            <span key={i} className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
              {addr}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (tx.type === "set_threshold") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Set Threshold</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{tx.oldThreshold}</span>
          <ArrowRight size={20} />
          <span className="text-2xl font-bold">{tx.newThreshold}</span>
        </div>
      </div>
    );
  }

  return null;
}

// ============ Member List Component ============
function MemberList({ members, votedCount, threshold }: { members: Member[]; votedCount: number; threshold: number }) {
  return (
    <div className="bg-white border border-t-0 rounded-b-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-gray-800">Members</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Voted{" "}
            <span className="font-medium">
              {votedCount}/{members.length}
            </span>
          </span>
          <span>
            Threshold{" "}
            <span className="font-medium">
              {threshold}/{members.length}
            </span>
          </span>
        </div>
      </div>

      {/* Member Rows */}
      <div className="divide-y">
        {members.map((member, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{member.name}</span>
              {member.isInitiator && <span className="text-sm text-blue-600">[Transaction Initiator]</span>}
              {member.isMe && <span className="text-sm text-orange-500">[me]</span>}
            </div>
            <VoteBadge status={member.voteStatus} />
          </div>
        ))}
      </div>
    </div>
  );
}
// ============ Transaction Type Label ============
function getTxTypeLabel(type: TxType): string {
  switch (type) {
    case "transfer":
      return "Transfer";
    case "add_signer":
      return "Add Signer";
    case "remove_signer":
      return "Remove Signer";
    case "set_threshold":
      return "Threshold";
  }
}

// ============ Transaction Details (Middle) ============
function TxDetails({ tx }: { tx: TransactionRowData }) {
  switch (tx.type) {
    case "transfer":
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/token/eth.svg" alt="ETH" width={20} height={20} />
            <span className="font-medium">{tx.amount} ETH</span>
          </div>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <span key={tx.id} className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.recipientAddress}
          </span>
        </div>
      );

    case "add_signer":
      return (
        <div className="flex items-center gap-2">
          {tx.signerAddresses?.slice(0, 2).map((addr, i) => (
            <span key={i} className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
              {addr}
            </span>
          ))}
          {(tx.signerAddresses?.length || 0) > 2 && (
            <span className="text-sm text-gray-500">+{(tx.signerAddresses?.length || 0) - 2} more</span>
          )}
        </div>
      );

    case "remove_signer":
      return (
        <div className="flex items-center gap-2">
          {tx.signerAddresses?.map((addr, i) => (
            <span key={i} className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
              {addr}
            </span>
          ))}
        </div>
      );

    case "set_threshold":
      return (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{tx.oldThreshold}</span>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <span className="font-semibold text-gray-800">{tx.newThreshold}</span>
        </div>
      );
  }
}

// ============ Main TransactionRow Component ============
interface TransactionRowProps {
  tx: TransactionRowData;
  onApprove?: (txId: string) => void;
  onDeny?: (txId: string) => void;
}

export function TransactionRow({ tx, onApprove, onDeny }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleApprove = () => {
    onApprove?.(tx.id);
  };

  const handleDeny = () => {
    onDeny?.(tx.id);
  };

  // Determine what to show on the right side
  const renderRightSide = () => {
    if (tx.status === "executed" || tx.status === "failed") {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

    // Not yet voted → show buttons
    if (tx.myVoteStatus === null) {
      return <ActionButtons onApprove={handleApprove} onDeny={handleDeny} />;
    }

    // Already voted → show vote status
    return <VoteBadge status={tx.myVoteStatus} />;
  };

  return (
    <div className="w-full mb-2">
      {/* Collapsed Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {/* Left: Chevron + Icon + Type + Details */}
        <div className="flex items-center gap-4">
          {expanded ? (
            <ChevronDown size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          ) : (
            <ChevronRight size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          )}

          <span className="font-medium text-[#888888] min-w-[100px]">{getTxTypeLabel(tx.type)}</span>

          <TxDetails tx={tx} />
        </div>

        {/* Right: Actions or Status */}
        <div onClick={e => e.stopPropagation()}>{renderRightSide()}</div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-1 mx-2">
          <TxHeader tx={tx} />
          <MemberList members={tx.members} votedCount={tx.votedCount} threshold={tx.threshold} />
        </div>
      )}
    </div>
  );
}

// ============ Mock Data ============
export const mockTransactions: TransactionRowData[] = [
  {
    id: "1",
    type: "transfer",
    status: "pending",
    amount: "1,000,000,000",
    recipientName: "Tim Cook",
    recipientAddress: "0x1234...5678",
    members: [
      { address: "0x111", name: "Hyydesi", isInitiator: false, isMe: true, voteStatus: "waiting" },
      { address: "0x222", name: "Jupeng cac", isInitiator: true, isMe: false, voteStatus: "approved" },
      { address: "0x333", name: "Nam", isInitiator: false, isMe: false, voteStatus: "denied" },
    ],
    votedCount: 2,
    threshold: 2,
    myVoteStatus: null, // Chưa vote → show buttons
  },
  {
    id: "2",
    type: "add_signer",
    status: "executed",
    signerAddresses: ["0xd...s78", "0xd...s78", "0xd...s78"],
    actionByName: "Jupeng cac",
    txHash: "0xabc123def456",
    members: [
      { address: "0x111", name: "Jupeng cac", isInitiator: true, isMe: false, voteStatus: "approved" },
      { address: "0x222", name: "Hyydesi", isInitiator: false, isMe: true, voteStatus: "approved" },
      { address: "0x333", name: "Nam", isInitiator: false, isMe: false, voteStatus: "approved" },
    ],
    votedCount: 3,
    threshold: 2,
    myVoteStatus: "approved",
  },
  {
    id: "3",
    type: "set_threshold",
    status: "pending",
    oldThreshold: 3,
    newThreshold: 5,
    members: [
      { address: "0x111", name: "Jupeng cac", isInitiator: true, isMe: false, voteStatus: "approved" },
      { address: "0x222", name: "Hyydesi", isInitiator: false, isMe: true, voteStatus: "denied" },
      { address: "0x333", name: "Nam", isInitiator: false, isMe: false, voteStatus: "waiting" },
    ],
    votedCount: 2,
    threshold: 2,
    myVoteStatus: "denied", // Đã vote deny
  },
  {
    id: "4",
    type: "remove_signer",
    status: "failed",
    signerAddresses: ["0xabc...def"],
    actionByName: "Nam",
    members: [
      { address: "0x111", name: "Jupeng cac", isInitiator: false, isMe: false, voteStatus: "denied" },
      { address: "0x222", name: "Hyydesi", isInitiator: false, isMe: true, voteStatus: "denied" },
      { address: "0x333", name: "Nam", isInitiator: true, isMe: false, voteStatus: "approved" },
    ],
    votedCount: 3,
    threshold: 2,
    myVoteStatus: "denied",
  },
  {
    id: "5",
    type: "transfer",
    status: "pending",
    amount: "500",
    recipientName: "Vitalik",
    recipientAddress: "0xvitalik",
    members: [
      { address: "0x111", name: "Hyydesi", isInitiator: false, isMe: true, voteStatus: "waiting" },
      { address: "0x222", name: "Jupeng cac", isInitiator: true, isMe: false, voteStatus: "approved" },
      { address: "0x333", name: "Nam", isInitiator: false, isMe: false, voteStatus: "waiting" },
    ],
    votedCount: 1,
    threshold: 2,
    myVoteStatus: null,
  },
];
