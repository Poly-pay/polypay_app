"use client";

import { memo, useEffect, useState } from "react";
import TransactionSummary from "./TransactionSummary";
import { X } from "lucide-react";

interface TransactionSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: {
    id: string;
    amount: string;
    recipient: string;
    contactName?: string;
    tokenIcon?: string;
    tokenSymbol?: string;
  }[];
  accountId: string | null;
  onConfirm?: () => void;
  isLoading?: boolean;
  loadingState?: string;
}

export const TransactionSummaryDrawer = memo(function TransactionSummaryDrawer({
  isOpen,
  onClose,
  transactions,
  accountId,
  onConfirm,
  isLoading = false,
  loadingState = "",
}: TransactionSummaryDrawerProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`lg:hidden fixed inset-0 bg-[#2b2929ad] bg-opacity-50 z-40 transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      ></div>
      <div
        className={`lg:hidden fixed right-0 top-0 h-full rounded-2xl w-[400px] max-w-[90vw] bg-white z-50 shadow-2xl transform transition-all duration-300 ease-in-out ${
          isAnimating ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col relative">
          <button
            className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
            onClick={onClose}
          >
            <X width={16} height={16} />
          </button>
          <TransactionSummary
            transactions={transactions}
            onConfirm={onConfirm}
            accountId={accountId}
            isLoading={isLoading}
            loadingState={loadingState}
            className="h-full"
          />
        </div>
      </div>
    </>
  );
});
