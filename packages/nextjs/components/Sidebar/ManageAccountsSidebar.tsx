"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import { TooltipProvider } from "../ui/tooltip";
import AccountItem from "./AccountItem";
import { Account } from "@polypay/shared";

interface ManageAccountsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: () => void;
  isLoading?: boolean;
}

export default function ManageAccountsSidebar({
  isOpen,
  onClose,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
  isLoading = false,
}: ManageAccountsSidebarProps) {
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const handleToggleExpand = (accountId: string) => {
    setExpandedAccountId(prev => (prev === accountId ? null : accountId));
  };

  return (
    <div
      className={`
  absolute left-full top-0 z-50 ml-3
  w-[330px] h-full bg-main-white rounded-lg p-3 flex flex-col gap-[15px]
  shadow-[4px_0px_24px_rgba(0,0,0,0.1)]
  transform transition-all duration-300 ease-in-out
  ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}
`}
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-1">
          {/* Title + Subtitle */}
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-medium text-main-black tracking-[-0.01em]">Manage Accounts</h2>
            <span className="text-sm font-normal text-grey-500 tracking-[-0.03em]">Below are your all accounts</span>
          </div>

          {/* Collapse Button */}
          <button
            className="w-11 h-11 flex items-center justify-center bg-main-white border border-grey-200 rounded-lg hover:bg-grey-50"
            onClick={onClose}
          >
            <Image src="/sidebar/chevrons-left.svg" alt="Collapse" width={24} height={24} />
          </button>
        </div>

        {/* Create Account Button */}
        <button
          className="w-full h-8 flex items-center justify-center gap-2 bg-main-pink rounded-lg hover:bg-pink-350"
          onClick={onCreateAccount}
        >
          <Image src="/sidebar/add-square.svg" alt="Add" width={20} height={20} />
          <span className="text-sm font-medium text-main-black tracking-[-0.04em]">Create new account</span>
        </button>
      </div>

      {/* Accounts List Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-main-black tracking-[-0.02em]">Multisig Accounts</span>
        <span className="text-sm font-medium text-main-navy-blue tracking-[-0.04em]">{accounts.length}</span>
      </div>

      {/* Accounts List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {isLoading ? (
          // Loading state
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : accounts.length === 0 ? (
          // Empty state
          <div className="flex-1 flex flex-col justify-center items-center gap-3 py-8">
            <div className="w-[120px] h-[120px] relative">
              <img src="/common/empty-avatar.svg" alt="No accounts" className="w-full h-full object-contain" />
            </div>
            <p className="text-center text-[#7B7B7B] text-sm leading-5 tracking-[-0.02em] font-normal">
              You don&apos;t have a multisig account yet.
              <br />
              Create one now to get started.
            </p>
          </div>
        ) : (
          // Has data
          <TooltipProvider delayDuration={200}>
            {accounts.map(account => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedAccountId === account.id}
                isExpanded={expandedAccountId === account.id}
                onSelect={onSelectAccount}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
