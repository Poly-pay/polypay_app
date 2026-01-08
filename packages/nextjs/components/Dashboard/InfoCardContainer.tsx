"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet, useModalApp, useWalletCommitments } from "~~/hooks";
import { usePendingTransactions } from "~~/hooks/api/useTransaction";
import { useWalletStore } from "~~/services/store";

type InfoCardContainerProps = unknown;

type InfoCardConfig = {
  gradient: string;
  bgImage: string;
  bgOpacity?: string;
  title: string;
  titleColor?: string;
  valueColor?: string;
  padding?: string;
  renderValue: () => React.ReactNode;
  renderAction?: () => React.ReactNode;
};

const InfoCard: React.FC<InfoCardConfig> = ({
  gradient,
  bgImage,
  bgOpacity = "",
  title,
  titleColor = "",
  valueColor = "",
  padding = "p-3 pb-0",
  renderValue,
  renderAction,
}) => {
  const bgOpacityValue = bgOpacity === "opacity-30" ? 0.3 : 1;

  return (
    <span className={`relative flex-1 h-[150px] block bg-gradient-to-r ${gradient} rounded-xl overflow-hidden`}>
      <span
        className="absolute right-0 top-0 h-full w-auto"
        style={{
          width: "70%",
          backgroundImage: `url('${bgImage}')`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right",
          backgroundSize: "contain",
          opacity: bgOpacityValue,
        }}
      />
      <div className={`relative z-10 ${padding} flex flex-col h-full justify-between`}>
        <span className="flex flex-row justify-between">
          <span className={titleColor}>{title}</span>
          {renderAction?.()}
        </span>
        <span className="flex flex-row gap-1 items-center">
          <span className={`text-[35px] ${valueColor} w-full`}>{renderValue()}</span>
        </span>
      </div>
    </span>
  );
};

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

  const cards: InfoCardConfig[] = useMemo(
    () => [
      {
        gradient: "from-[#FF7CEB] to-[#FFACF2]",
        bgImage: "/dashboard/bg-account.svg",
        bgOpacity: "opacity-30",
        title: "Account",
        titleColor: "text-white",
        padding: "p-3",
        renderValue: () => (
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Image src="/dashboard/circle-polypay-icon.svg" alt="Polypay Icon" width={30} height={30} />
              <Image src="/dashboard/polypay-text.svg" alt="Polypay text" width={130} height={130} />
            </div>
            <span className="text-black px-3 py-1 text-sm rounded-2xl bg-[#C2FFCA] truncate max-w-44">
              {currentWallet?.name ?? "Default"}
            </span>
          </div>
        ),
        renderAction: () =>
          walletClient?.account && (walletCommitments?.length ?? 0) > 0 ? (
            <span className="cursor-pointer" onClick={() => openModal("editAccount")}>
              <Image
                src="/misc/edit-icon.svg"
                alt="Edit Account"
                width={25}
                height={25}
                style={{ filter: "brightness(0) saturate(100%) invert(100%)" }}
              />
            </span>
          ) : null,
      },
      {
        gradient: "from-[#CEEFE8] to-[#9DCFF0]",
        bgImage: "/dashboard/bg-pending-tx.svg",
        title: "Pending Transactions",
        renderValue: () => transactions?.length ?? 0,
      },
      {
        gradient: "from-[#BBB4F7] to-[#6D2EFF]",
        bgImage: "/dashboard/bg-signer-list.svg",
        bgOpacity: "opacity-30",
        title: "Signers List",
        titleColor: "text-white",
        valueColor: "text-white",
        renderValue: () => walletCommitments?.length ?? 0,
      },
    ],
    [currentWallet?.name, transactions?.length, walletClient?.account, walletCommitments?.length, openModal],
  );

  return (
    <>
      <span className="grid xl:grid-cols-3 grid-cols-1 gap-2 w-full justify-between">
        {cards.map((card, index) => (
          <InfoCard key={index} {...card} />
        ))}
      </span>
    </>
  );
};

export default InfoCardContainer;
