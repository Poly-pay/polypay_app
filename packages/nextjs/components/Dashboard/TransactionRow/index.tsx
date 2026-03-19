"use client";

import React, { useEffect, useState } from "react";
import { ActionButtons, AwaitingBadge, StatusBadge } from "./Badges";
import { BatchRowMenu } from "./BatchRowMenu";
import { SignerList } from "./SignerList";
import { TxDetails } from "./TxDetails";
import { TxHeader } from "./TxHeader";
import { getTxTypeLabel } from "./utils";
import { TxStatus, TxType } from "@polypay/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TransactionRowData, useTransactionVote, useWalletCommitments, useWalletThreshold } from "~~/hooks";
import { formatAddress } from "~~/utils/format";

export { convertToRowData } from "./utils";

interface TransactionRowProps {
  tx: TransactionRowData;
  onSuccess?: () => void;
}

export function TransactionRow({ tx, onSuccess }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isExecutable, setIsExecutable] = useState(false);

  const { data: walletThreshold } = useWalletThreshold();
  const { data: commitmentsData } = useWalletCommitments();

  const totalSigners = commitmentsData?.length || 0;

  const {
    approve,
    deny,
    execute,
    isLoading: loading,
    loadingState,
    loadingStep,
    totalSteps,
  } = useTransactionVote({ onSuccess });

  const handleApprove = async () => {
    await approve(tx);
  };
  const handleDeny = async () => {
    await deny(tx);
  };
  const handleExecute = async (txId: number) => {
    await execute(txId);
  };

  const initiator = tx.members.find(m => m.isInitiator);
  const initiatorName = initiator
    ? initiator.name || formatAddress(initiator.commitment, { start: 4, end: 4 })
    : "Unknown";
  const initiatorCommitment = initiator?.commitment || "";

  useEffect(() => {
    if (tx.status !== TxStatus.PENDING) {
      setIsExecutable(false);
      return;
    }
    setIsExecutable(tx.approveCount >= Number(walletThreshold));
  }, [tx.status, tx.approveCount, walletThreshold]);

  const renderRightSide = () => {
    if (tx.status === TxStatus.EXECUTED || tx.status === TxStatus.FAILED) {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

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

    if (tx.myVoteStatus === null) {
      if (expanded) return <AwaitingBadge />;
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

    return <AwaitingBadge />;
  };

  return (
    <div className="w-full mb-2">
      {loading && loadingState && (
        <div className="mb-1 flex">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-sm px-4 py-1 rounded-full">
            {loadingStep > 0 && totalSteps > 1 && (
              <span className="font-medium">
                Step {loadingStep}/{totalSteps}
              </span>
            )}
            <span>{loadingState}</span>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col p-6 gap-3 bg-white border-b border-b-grey-200 rounded-xl ${!expanded ? "pb-0 pt-3" : "pt-3"}`}
        onClick={() => setExpanded(!expanded)}
      >
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
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {renderRightSide()}
            {tx.type === TxType.BATCH && tx.batchData && <BatchRowMenu batchData={tx.batchData} />}
          </div>
        </div>

        {expanded && (
          <div className="flex flex-col gap-3 overflow-hidden">
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
