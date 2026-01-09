"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet, useModalApp, useWalletCommitments } from "~~/hooks";
import { usePendingTransactions } from "~~/hooks/api/useTransaction";
import { useWalletStore } from "~~/services/store";

type InfoCardContainerProps = unknown;

const InfoCardContainer: React.FC<InfoCardContainerProps> = () => {
  const { data: walletClient } = useWalletClient();
  const { openModal } = useModalApp();

  const metaMultiSigWallet = useMetaMultiSigWallet();

  const walletAddress = metaMultiSigWallet?.address || "";

  const { data } = usePendingTransactions(walletAddress);
  const { data: walletCommitments } = useWalletCommitments();

  const { currentWallet } = useWalletStore();

  // Memoize flattened transactions to avoid re-computing on every render
  const transactions = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data?.pages]);

  return (
    <>
      <span className="flex flex-row gap-5 w-full justify-between">
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-pink-350 to-pink-150 rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-account.svg')] bg-no-repeat bg-right bg-contain opacity-30"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span className="text-white">Account</span>
              {!(walletClient?.account && (walletCommitments?.length ?? 0) > 0) ? null : (
                <span className="cursor-pointer" onClick={() => openModal("editAccount")}>
                  <Image
                    src="/misc/edit-icon.svg"
                    alt="Edit Account"
                    width={25}
                    height={25}
                    style={{ filter: "brightness(0) saturate(100%) invert(100%)" }}
                  />
                </span>
              )}
            </span>
            <span className="flex flex-row gap-2 items-center">
              <Image src="/dashboard/circle-polypay-icon.svg" alt="Polypay Icon" width={30} height={30} />
              <Image src="/dashboard/polypay-text.svg" alt="Polypay text" width={130} height={130} />
              <span className="text-black px-3 py-1 rounded-2xl bg-lime-50">{currentWallet?.name ?? "Default"}</span>
            </span>
          </div>
        </span>
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-green-150 to-blue-100 rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-pending-tx.svg')] bg-no-repeat bg-right bg-contain"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 pb-0 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span>Pending Transactions</span>
            </span>
            <span className="flex flex-row gap-1 items-center">
              <span className="text-[35px]">{transactions?.length ?? 0}</span>
            </span>
          </div>
        </span>
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-violet-50 to-violet-300 rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-signer-list.svg')] bg-no-repeat bg-right bg-contain opacity-30"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 pb-0 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span className="text-white">Signers List</span>
            </span>
            <span className="flex flex-row gap-1 items-center">
              <span className="text-[35px] text-white">{walletCommitments?.length ?? 0}</span>
            </span>
          </div>
        </span>
      </span>
    </>
  );
};

export default InfoCardContainer;
