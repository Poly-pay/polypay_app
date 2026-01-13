"use client";

import React from "react";
import Image from "next/image";
import { formatAddress } from "~~/utils/format";

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
    <div className={`bg-white relative rounded-lg h-full overflow-hidden ${className} transition-all`}>
      <div className="p-5">
        {/* Header Section */}
        <div className="flex flex-col gap-3 items-start justify-start  w-full">
          <Image src="/batch/tx-summary.svg" alt="Batch transactions" width={74} height={57} />
          <div className="flex flex-col items-start justify-start w-full mt-3 gap-1">
            <div className="font-semibold text-grey-950 text-2xl tracking-[-0.72px] uppercase w-full">
              Transactions summary
            </div>
            <div className="text-grey-700 text-sm tracking-[-0.54px] w-full">
              Please review the information below and confirm to <br /> make the transaction.
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex flex-col gap-0.5 max-h-[400px] items-center justify-start w-full overflow-y-auto mt-10">
          {transactions.map(transaction => (
            <div
              key={transaction.id}
              className="bg-grey-50 flex gap-3 items-center justify-between p-3 w-full rounded-lg"
            >
              {/* Amount with Token Icon */}
              <div className="flex items-center gap-1 text-grey-950 text-[16px]">
                {transaction.tokenIcon && (
                  <Image src={transaction.tokenIcon} alt={transaction.tokenSymbol || "token"} width={20} height={20} />
                )}
                {transaction.amount}
              </div>

              {/* Arrow */}
              <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />

              {/* Recipient */}

              <div
                className={`flex items-center gap-1 text-back text-xs font-medium bg-white rounded-full w-fit pl-1 pr-4 py-1`}
              >
                <Image src={"/new-account/default-avt.svg"} alt="avatar" width={16} height={16} />
                {transaction.contactName ? (
                  <div className=" max-w-24 overflow-hidden truncate">
                    <span className="font-medium">{transaction.contactName}</span>
                    <span>{"(" + `${formatAddress(transaction.recipient, { start: 3, end: 3 }) + ")"}`}</span>
                  </div>
                ) : (
                  formatAddress(transaction.recipient, { start: 3, end: 3 })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Button Section */}
      <div className="bg-grey-50 absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-grey-200">
        <button
          onClick={onConfirm}
          disabled={isLoading || transactions.length === 0}
          className="flex items-center justify-center px-5 py-3 rounded-lg w-full disabled:opacity-50 bg-main-pink"
        >
          <span className="font-semibold text-sm text-center">
            {isLoading ? loadingState || "Processing..." : `Execute`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TransactionSummary;
