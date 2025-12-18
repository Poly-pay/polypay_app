"use client";

import React from "react";
import Image from "next/image";

interface TransactionSummaryProps {
  transactions: {
    id: string;
    amount: string;
    recipient: string;
    contactName?: string;
    tokenIcon?: string;
    tokenSymbol?: string;
  }[];
  onConfirm?: () => void;
  className?: string;
  isLoading?: boolean;
  loadingState?: string;
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  transactions,
  onConfirm,
  className,
  isLoading = false,
  loadingState = "",
}) => {
  return (
    <div className={`bg-white relative rounded-lg h-full overflow-hidden border border-primary ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col gap-3 items-start justify-start p-3 w-full">
        {/* <img src="/misc/shopping-bag.svg" alt="Batch transactions" className="w-20 h-20" /> */}
        <div className="flex flex-col gap-[3px] items-start justify-start w-full">
          <div className="font-semibold text-[#363636] text-2xl tracking-[-0.72px] uppercase w-full">
            Transactions summary
          </div>
          <div className="text-[#999999] text-lg tracking-[-0.54px] w-full">
            Please review the selected transactions and confirm to propose them.
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-0.5 max-h-[400px] items-center justify-start px-3 py-0 w-full overflow-y-auto">
        {transactions.map(transaction => (
          <div key={transaction.id} className="bg-[#f7f7f7] flex gap-3 items-center justify-start p-3 w-full rounded">
            {/* Amount with Token Icon */}
            <div className="grow flex items-center gap-1 text-[#363636] text-[16px]">
              {transaction.tokenIcon && (
                <Image src={transaction.tokenIcon} alt={transaction.tokenSymbol || "token"} width={20} height={20} />
              )}
              {transaction.amount}
            </div>

            {/* Arrow */}
            <div className="relative w-16">
              {/* <img src="/arrow/thin-long-arrow-right.svg" alt="arrow" className="w-full h-full" /> */}
            </div>

            {/* Recipient */}
            <div className="text-[#363636] text-[16px]">
              To: [{" "}
              {transaction.contactName ? (
                <>
                  <span className="font-medium">{transaction.contactName}</span>
                  <span className="text-gray-500 ml-1">({transaction.recipient})</span>
                </>
              ) : (
                transaction.recipient
              )}
              ]
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Button Section */}
      <div className="bg-[#f7f7f7] absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-[#e0e0e0]">
        <button
          onClick={onConfirm}
          disabled={isLoading || transactions.length === 0}
          className="bg-gradient-to-b from-[#48b3ff] to-[#0059ff] flex items-center justify-center px-5 py-3 rounded-[10px] shadow-[0px_2px_4px_-1px_rgba(12,12,106,0.5),0px_0px_0px_1px_#4470ff] w-full disabled:opacity-50 cursor-pointer"
        >
          <span className="font-semibold text-[16px] text-center text-white tracking-[-0.16px]">
            {isLoading
              ? loadingState || "Processing..."
              : `Propose ${transactions.length} transaction${transactions.length > 1 ? "s" : ""}`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TransactionSummary;
