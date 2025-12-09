"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import InfoCardContainer from "./InfoCardContainer";
import { TransactionRow, convertToRowData } from "./TransactionRow";
import { useTransactions } from "~~/hooks/api/useTransaction";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

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
  const [myCommitment, setMyCommitment] = useState<string>("");
  const [currentThreshold, setCurrentThreshold] = useState<number>(0);
  const [totalSigners, setTotalSigners] = useState<number>(0);

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
  });

  const walletAddress = metaMultiSigWallet?.address || "";

  const { data: transactions, isLoading, refetch } = useTransactions(walletAddress);

  // Load my commitment from localStorage
  useEffect(() => {
    const commitment = localStorage.getItem("commitment");
    if (commitment) {
      setMyCommitment(commitment);
    }
  }, []);

  // Load contract data
  useEffect(() => {
    const loadContractData = async () => {
      if (!metaMultiSigWallet) return;

      try {
        const threshold = await metaMultiSigWallet.read.signaturesRequired();
        const signers = await metaMultiSigWallet.read.getSignersCount();

        setCurrentThreshold(Number(threshold));
        setTotalSigners(Number(signers));
      } catch (error) {
        console.error("Error loading contract data:", error);
      }
    };

    loadContractData();
  }, [metaMultiSigWallet]);

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
      ) : transactions && transactions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {transactions.map(tx => (
            <TransactionRow
              key={tx.id}
              tx={convertToRowData(tx, myCommitment, currentThreshold)}
              totalSigners={totalSigners}
              onSuccess={handleSuccess}
            />
          ))}
        </div>
      ) : (
        emptyTransactionComponent
      )}
    </div>
  );
}
