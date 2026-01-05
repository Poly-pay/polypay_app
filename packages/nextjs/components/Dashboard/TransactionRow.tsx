"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  TxStatus as ApiTxStatus,
  TxType as ApiTxType,
  Transaction,
  encodeAddSigner,
  encodeBatchTransfer,
  encodeBatchTransferMulti,
  encodeERC20Transfer,
  encodeRemoveSigner,
  encodeUpdateThreshold,
  horizenTestnet,
} from "@polypay/shared";
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { useWalletClient } from "wagmi";
import { NATIVE_ETH, getTokenByAddress } from "~~/constants";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useApproveTransaction, useDenyTransaction, useExecuteTransaction } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { formatAddress, formatAmount } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";

type TxType = "transfer" | "add_signer" | "remove_signer" | "set_threshold" | "batch";
type VoteStatus = "approved" | "denied" | "waiting";
type TxStatus = "pending" | "executed" | "failed";

interface Member {
  commitment: string;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus;
}

interface BatchTransfer {
  recipient: string;
  amount: string;
  contactId?: string;
  contactName?: string;
  tokenAddress?: string;
}

interface TransactionRowData {
  id: string;
  txId: number;
  type: TxType;
  nonce: number;
  status: TxStatus;
  txHash?: string;
  amount?: string;
  recipientAddress?: string;
  tokenAddress?: string;
  signerCommitment?: string;
  oldThreshold?: number;
  newThreshold?: number;
  batchData?: BatchTransfer[];
  contact?: {
    id: string;
    name: string;
    address: string;
  };
  totalSigners: number;
  members: Member[];
  votedCount: number;
  threshold: number;
  approveCount: number;
  myVoteStatus: VoteStatus | null;
  walletAddress: string;
}

export function convertToRowData(tx: Transaction, myCommitment: string): TransactionRowData {
  const typeMap: Record<ApiTxType, TxType> = {
    TRANSFER: "transfer",
    ADD_SIGNER: "add_signer",
    REMOVE_SIGNER: "remove_signer",
    SET_THRESHOLD: "set_threshold",
    BATCH: "batch",
  };

  const statusMap: Record<ApiTxStatus, TxStatus> = {
    PENDING: "pending",
    EXECUTED: "executed",
    FAILED: "failed",
  };

  const members: Member[] = tx.votes.map(vote => ({
    commitment: vote.voterCommitment,
    isInitiator: vote.voterCommitment === tx.createdBy,
    isMe: vote.voterCommitment === myCommitment,
    voteStatus: vote.voteType === "APPROVE" ? "approved" : "denied",
  }));

  const myVote = tx.votes.find(v => v.voterCommitment === myCommitment);
  const myVoteStatus: VoteStatus | null = myVote ? (myVote.voteType === "APPROVE" ? "approved" : "denied") : null;

  const approveCount = tx.votes.filter(v => v.voteType === "APPROVE").length;

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
    type: typeMap[tx.type],
    status: statusMap[tx.status],
    nonce: tx.nonce,
    txHash: tx.txHash || undefined,
    amount: tx.value || undefined,
    recipientAddress: tx.to || undefined,
    tokenAddress: tx.tokenAddress || undefined,
    signerCommitment: tx.signerCommitment || undefined,
    oldThreshold: tx.threshold,
    newThreshold: tx.newThreshold || undefined,
    batchData,
    totalSigners: tx.totalSigners,
    members,
    votedCount: tx.votes.length,
    threshold: tx.threshold,
    approveCount,
    myVoteStatus,
    walletAddress: tx.walletAddress,
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
      <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
        <span className="font-medium">{contactName}</span>
        <span className="text-gray-500 ml-1">({formatAddress(address)})</span>
      </span>
    );
  }
  return <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">{formatAddress(address)}</span>;
}

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

function StatusBadge({ status, txHash }: { status: TxStatus; txHash?: string }) {
  if (status === "executed") {
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

  if (status === "failed") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Failed</span>;
  }

  return null;
}

function ActionButtons({
  onApprove,
  onDeny,
  onExecute,
  loading,
  isExecutable,
}: {
  onApprove: () => void;
  onDeny: () => void;
  onExecute: () => void;
  loading: boolean;
  isExecutable: boolean;
}) {
  if (isExecutable) {
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          onExecute();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Executing..." : "Execute"}
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
        className="px-6 py-2 text-sm font-medium text-white bg-[#FF7CEB] rounded-full hover:bg-[#f35ddd] transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}

function TxHeader({ tx }: { tx: TransactionRowData }) {
  if (tx.type === "transfer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
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

  if (tx.type === "add_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-4">Add Signer</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 10)}...{tx.signerCommitment?.slice(-8)}
          </span>
        </div>
      </div>
    );
  }

  if (tx.type === "remove_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Remove Signer</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 10)}...{tx.signerCommitment?.slice(-8)}
          </span>
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

  if (tx.type === "batch" && tx.batchData) {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
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
    case "transfer":
      return "Transfer";
    case "add_signer":
      return "Add Signer";
    case "remove_signer":
      return "Remove Signer";
    case "set_threshold":
      return "Threshold";
    case "batch":
      return "Batch";
  }
}

function TxDetails({ tx }: { tx: TransactionRowData }) {
  switch (tx.type) {
    case "transfer":
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

    case "add_signer":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 8)}...{tx.signerCommitment?.slice(-6)}
          </span>
        </div>
      );

    case "remove_signer":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 8)}...{tx.signerCommitment?.slice(-6)}
          </span>
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

    case "batch":
      if (!tx.batchData || tx.batchData.length === 0) {
        return <span className="text-gray-500">No transfers</span>;
      }
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-3 py-1 rounded-3xl">
            {tx.batchData.length} transfer{tx.batchData.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tx.batchData.length} transfers</span>
          </div>
        </div>
      );
  }
}

interface TransactionRowProps {
  tx: TransactionRowData;
  onSuccess?: () => void;
}

export function TransactionRow({ tx, onSuccess }: TransactionRowProps) {
  const { commitment } = useIdentityStore();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();

  const { mutateAsync: approve } = useApproveTransaction();
  const { mutateAsync: deny } = useDenyTransaction();
  const { mutateAsync: executeOnChain } = useExecuteTransaction();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });
  const [isExecutable, setIsExecutable] = useState(false);

  const handleApprove = async () => {
    if (!walletClient || !metaMultiSigWallet) {
      throw new Error("Wallet not connected");
    }

    if (!commitment) {
      notification.error("No commitment found");
      return;
    }

    let callData: `0x${string}` = "0x";
    let to: `0x${string}` = tx.recipientAddress as `0x${string}`;
    let value = BigInt(tx.amount || "0");

    if (tx.type === "transfer") {
      if (tx.tokenAddress && tx.tokenAddress !== NATIVE_ETH.address) {
        to = tx.tokenAddress as `0x${string}`;
        value = 0n;
        callData = encodeERC20Transfer(tx.recipientAddress!, BigInt(tx.amount || "0")) as `0x${string}`;
      }
    } else {
      to = tx.walletAddress as `0x${string}`;
      value = 0n;

      if (tx.type === "add_signer") {
        callData = encodeAddSigner(tx.signerCommitment!, tx.newThreshold!);
      } else if (tx.type === "remove_signer") {
        callData = encodeRemoveSigner(tx.signerCommitment!, tx.newThreshold!);
      } else if (tx.type === "set_threshold") {
        callData = encodeUpdateThreshold(tx.newThreshold!);
      } else if (tx.type === "batch" && tx.batchData) {
        const recipients = tx.batchData.map(item => item.recipient as `0x${string}`);
        const amounts = tx.batchData.map(item => BigInt(item.amount));
        const tokenAddresses = tx.batchData.map(item => item.tokenAddress || NATIVE_ETH.address);

        const hasERC20 = tokenAddresses.some(addr => addr !== NATIVE_ETH.address);

        callData = hasERC20
          ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
          : encodeBatchTransfer(recipients, amounts);
      }
    }

    const txHash = (await metaMultiSigWallet.read.getTransactionHash([
      BigInt(tx.nonce),
      to,
      value,
      callData,
    ])) as `0x${string}`;

    setLoading(true);
    try {
      const proofData = await generateProof(txHash);

      setLoadingState("Submitting to backend...");
      await approve({
        txId: tx.txId,
        dto: {
          proof: proofData.proof,
          publicInputs: proofData.publicInputs,
          nullifier: proofData.nullifier,
        },
      });

      notification.success("Vote submitted!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Approve error:", error);
      notification.error(error.message || "Failed to approve");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      if (!commitment) {
        notification.error("No commitment found");
        return;
      }

      setLoadingState("Submitting deny vote...");
      await deny({
        txId: tx.txId,
        dto: {
          totalSigners: tx.totalSigners,
        },
      });

      notification.success("Deny vote submitted!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Deny error:", error);
      notification.error(error.message || "Failed to deny");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleExecute = async (txId: number) => {
    setLoading(true);
    try {
      setLoadingState("Executing on-chain...");

      const result = await executeOnChain(txId);

      console.log("Transaction executed:", result.txHash);
      notification.success("Transaction executed successfully!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Execute error:", error);
      notification.error(error.message || "Failed to execute");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const renderRightSide = () => {
    if (tx.status === "executed" || tx.status === "failed") {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

    if (tx.myVoteStatus === null || isExecutable) {
      return (
        <ActionButtons
          onApprove={handleApprove}
          onDeny={handleDeny}
          onExecute={() => handleExecute(tx.txId)}
          loading={loading}
          isExecutable={isExecutable}
        />
      );
    }

    return <VoteBadge status={tx.myVoteStatus} />;
  };

  useEffect(() => {
    const checkExecutable = async () => {
      if (tx.status !== "pending" || !metaMultiSigWallet) {
        setIsExecutable(false);
        return;
      }

      try {
        const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
        setIsExecutable(tx.approveCount >= Number(currentThreshold));
      } catch (error) {
        console.error("Failed to check threshold:", error);
        setIsExecutable(false);
      }
    };

    checkExecutable();
  }, [tx.status, tx.approveCount, metaMultiSigWallet]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#6D2EFF] animate-spin" />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Transaction</h3>
                <p className="text-sm text-gray-600">{loadingState || "Please wait..."}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full mb-2">
        <div
          onClick={() => !loading && setExpanded(!expanded)}
          className="flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            {expanded ? (
              <ChevronDown size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
            ) : (
              <ChevronRight size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
            )}
            <span className="font-medium text-[#888888] min-w-[100px]">{getTxTypeLabel(tx.type)}</span>
            <TxDetails tx={tx} />
          </div>
          <div onClick={e => e.stopPropagation()}>{renderRightSide()}</div>
        </div>

        {expanded && (
          <div className="mt-1 mx-2">
            <TxHeader tx={tx} />
            <MemberList
              members={tx.members}
              votedCount={tx.votedCount}
              threshold={tx.threshold}
              totalSigners={tx.totalSigners}
            />
          </div>
        )}
      </div>
    </>
  );
}
