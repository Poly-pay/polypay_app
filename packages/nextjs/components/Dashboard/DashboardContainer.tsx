"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import InfoCardContainer from "./InfoCardContainer";
import  { mockTransactions, TransactionRow } from "./TransactionRow";

export interface WalletData {
  signers: string[];
  threshold: number;
  message_queue: any[];
  metadata: any[];
}

// Header Component
function Header() {
  return (
    <div className="flex flex-col items-start justify-between w-full">
      <div className="text-[55.78px] text-text-primary capitalize leading-none">
        <p>Dashboard</p>
      </div>
      <InfoCardContainer />
    </div>
  );
}

export default function DashboardContainer() {
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleApprove = (txId: string) => {
    console.log("Approve:", txId);
    // Generate ZK proof và submit
  };

  const handleDeny = (txId: string) => {
    console.log("Deny:", txId);
  };

  const emptyTransactionComponent = (
    <span className="flex flex-col gap-3 w-full items-center justify-center mt-10 text-text-secondary">
      <Image src="/common/empty-avatar.svg" alt="No transactions found" width={200} height={177} />
      <span className="text-[#6D2EFF] font-bold text-[20px]">No transaction found</span>
      <span>There is not transaction found in your account</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-5 p-2 px-[130px] pt-7">
      <Header />
      {/* {emptyTransactionComponent} */}
      {/* body */}
      {mockTransactions.map(tx => (
        <TransactionRow key={tx.id} tx={tx} onApprove={handleApprove} onDeny={handleDeny} />
      ))}
    </div>
  );
}
