"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useMetaMultiSigWallet, useWalletCommitments } from "~~/hooks";
import { usePendingTransactions } from "~~/hooks/api/useTransaction";
import { useAccountStore } from "~~/services/store";

type InfoCardContainerProps = unknown;

const InfoCardContainer: React.FC<InfoCardContainerProps> = () => {
  // const { data: walletClient } = useWalletClient();
  // const { openModal } = useModalApp();

  const metaMultiSigWallet = useMetaMultiSigWallet();

  const accountAddress = metaMultiSigWallet?.address || "";

  const { data } = usePendingTransactions(accountAddress);
  const { data: walletCommitments } = useWalletCommitments();

  const { currentAccount } = useAccountStore();

  // Memoize flattened transactions to avoid re-computing on every render
  const transactions = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data?.pages]);

  return (
    <div className="flex flex-row gap-2 w-full justify-between my-4">
      {/* Card 1 - Account */}
      <div className="relative flex-1 h-[120px] block bg-gradient-to-l from-pink-350 to-pink-150 rounded-lg overflow-hidden">
        <div
          className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-account.svg')] bg-no-repeat bg-right bg-contain opacity-20"
          style={{ width: "70%" }}
        />

        <div className="relative z-10 p-3 flex flex-col h-full justify-between">
          <div className="flex flex-row justify-between items-start">
            <span className="text-main-black text-sm font-medium capitalize">Account</span>
            {/* TODO: switch account modal */}
            {/* {!(walletClient?.account && (walletCommitments?.length ?? 0) > 0) ? null : (
              <span className="cursor-pointer" onClick={() => openModal("editAccount")}>
                <Image src="/icons/actions/rotate-360.svg" alt="Refresh" width={18} height={18} />
              </span>
            )} */}
          </div>
          <div className="flex flex-row gap-2 items-center">
            <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shrink-0">
              <Image src="/dashboard/circle-polypay-icon.svg" alt="Polypay Icon" width={24} height={24} />
            </span>
            <span className="font-family-repetition text-[32px] text-white leading-none tracking-[-0.01em] max-w-[122px] truncate">
              {currentAccount?.name ?? "PolyPay"}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2 - Pending Transactions */}
      <div className="relative flex-1 h-[120px] block bg-gradient-to-r from-green-150 to-blue-100 rounded-lg overflow-hidden">
        <div
          className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-pending-tx.svg')] bg-no-repeat bg-right bg-contain"
          style={{ width: "70%" }}
        />

        <div className="relative z-10 p-3 flex flex-col h-full justify-between">
          <div className="flex flex-row justify-between items-start">
            <span className="text-main-black text-sm font-medium capitalize">Pending Transactions</span>
          </div>
          <div className="flex flex-row gap-1 items-center">
            <span className="font-family-repetition text-[36px] text-main-black leading-none tracking-[-0.01em]">
              {String(transactions?.length ?? 0).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3 - Signers List */}
      <div className="relative flex-1 h-[120px] block bg-gradient-to-r from-violet-50 to-violet-300 rounded-lg overflow-hidden">
        <div
          className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-signer-list.svg')] bg-no-repeat bg-right bg-contain opacity-20"
          style={{ width: "70%" }}
        />

        <div className="relative z-10 p-3 flex flex-col h-full justify-between">
          <div className="flex flex-row justify-between items-start">
            <span className="text-white text-sm font-medium capitalize">Signers List</span>
            {/* TODO: signer list modal */}
            {/* <button className="flex items-center justify-center px-2 py-1 bg-white/50 backdrop-blur-sm rounded-full">
              <span className="text-main-black text-xs font-medium tracking-[-0.01em]">See all</span>
            </button> */}
          </div>
          <div className="flex flex-row justify-between items-end">
            <span className="font-family-repetition text-[36px] text-white leading-none tracking-[-0.01em]">
              {String(walletCommitments?.length ?? 0).padStart(2, "0")}
            </span>
            {/* Avatar stack */}
            <div className="flex flex-row items-center">
              {Array.from({ length: Math.min(walletCommitments?.length ?? 0, 3) }).map((_, index) => (
                <Image
                  key={index}
                  src={`/avatars/signer-${index + 1}.svg`}
                  alt={`Signer ${index + 1}`}
                  width={24}
                  height={24}
                  className={`w-6 h-6 rounded-full border border-violet-300 ${index > 0 ? "-ml-1.5" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCardContainer;
