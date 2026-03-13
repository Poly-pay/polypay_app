"use client";

import React from "react";
import Image from "next/image";
import { useContacts } from "~~/hooks";
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
  accountId: string | null;
  loadingStep?: number;
  totalSteps?: number;
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  transactions,
  onConfirm,
  className,
  isLoading = false,
  loadingState = "",
  accountId,
  loadingStep = 0,
  totalSteps = 4,
}) => {
  const { data: contacts = [] } = useContacts(accountId);
  return (
    <div className={`bg-white relative rounded-lg h-full overflow-hidden ${className} transition-all`}>
      <div className="p-5">
        {/* Header Section */}
        <div className="flex flex-col gap-3 items-start justify-start  w-full">
          <Image src="/batch/tx-summary.svg" alt="Batch transactions" width={74} height={57} className="shrink-0" />
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
          {transactions.map(transaction => {
            const matchedContact = contacts.find(
              contact => contact.address.toLowerCase() === transaction.recipient.toLowerCase(),
            );

            return (
              <div key={transaction.id} className="bg-grey-50 flex gap-3 items-center p-3 w-full rounded-lg">
                {/* Amount with Token Icon */}
                <div className="flex items-center gap-1 text-grey-950 text-base whitespace-nowrap shrink-0">
                  {transaction.tokenIcon && (
                    <Image
                      src={transaction.tokenIcon}
                      alt={transaction.tokenSymbol || "token"}
                      width={20}
                      height={20}
                    />
                  )}
                  {transaction.amount}
                </div>

                {/* Arrow */}
                <div className="shrink min-w-0">
                  <Image
                    src="/icons/arrows/arrow-right-long-purple.svg"
                    alt="Arrow Right"
                    width={60}
                    height={20}
                    className="max-w-full h-auto"
                  />
                </div>

                {/* Recipient */}
                <div className="min-w-0 shrink">
                  {matchedContact ? (
                    <div className="flex items-center gap-1 text-black text-xs font-medium bg-white rounded-full pl-1 pr-4 py-1">
                      <Image
                        src={"/avatars/default-avt.svg"}
                        alt="avatar"
                        width={16}
                        height={16}
                        className="shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-medium">{matchedContact.name}</span>
                        <span>{"(" + `${formatAddress(transaction.recipient, { start: 3, end: 3 }) + ")"}`}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium text-black bg-white">
                      <Image
                        src={"/avatars/default-avt.svg"}
                        alt="avatar"
                        width={16}
                        height={16}
                        className="shrink-0"
                      />
                      <span className="truncate">{formatAddress(transaction.recipient, { start: 3, end: 3 })}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Button Section */}
      <div className="bg-grey-50 absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-grey-200">
        {isLoading && loadingState && loadingStep > 0 && (
          <div className="flex flex-col items-center gap-2 w-full mb-3">
            <div className="text-sm text-gray-500">
              Step {loadingStep} of {totalSteps} — {loadingState}
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(loadingStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={onConfirm}
          disabled={isLoading || transactions.length === 0}
          className="flex items-center justify-center px-5 py-3 rounded-lg w-full disabled:opacity-50 bg-main-pink"
        >
          <span className="font-semibold text-sm text-center">
            {isLoading ? loadingState || "Processing..." : `Submit batch`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TransactionSummary;
