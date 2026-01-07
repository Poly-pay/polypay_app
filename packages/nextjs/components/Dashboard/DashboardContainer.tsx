"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import InfoCardContainer from "./InfoCardContainer";
import { TransactionRow, convertToRowData } from "./TransactionRow";
import { useInfiniteScroll, useMetaMultiSigWallet } from "~~/hooks";
import { useTransactionRealtime, useTransactionsInfinite } from "~~/hooks/api/useTransaction";
import { useIdentityStore } from "~~/services/store";

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
  const { commitment } = useIdentityStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const walletAddress = metaMultiSigWallet?.address || "";

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useTransactionsInfinite(walletAddress);

  useTransactionRealtime(walletAddress);

  const { ref } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // Memoize flattened transactions to avoid re-computing on every render
  const transactions = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data?.pages]);

  const handleSuccess = () => {
    refetch();
  };

  const emptyTransactionComponent = (
    <span className="flex flex-col gap-3 w-full items-center justify-center mt-10 text-text-secondary">
      <Image src="/common/empty-avatar.svg" alt="No transactions found" width={200} height={177} />
      <span className="text-[#6D2EFF] font-bold text-[20px]">No transaction found</span>
      <span>There is no transaction found in your account</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-5 p-2 px-[130px] pt-7">
      <Header />

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : transactions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {transactions.map((tx: any) => (
            <TransactionRow key={tx.id} tx={convertToRowData(tx, commitment ?? "")} onSuccess={handleSuccess} />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="py-4 text-center">
            {isFetchingNextPage && <span className="text-text-secondary">Loading more...</span>}
            {!hasNextPage && <span className="text-text-secondary text-sm">No more transactions</span>}
          </div>
        </div>
      ) : (
        emptyTransactionComponent
      )}
    </div>
  );
}
