"use client";

import React, { useState } from "react";
import Image from "next/image";
import { EditAccountModal } from "../Modals/EditAccountModal";
import { Skeleton } from "../ui/skeleton";
import { WalletData } from "./DashboardContainer";
import { Settings } from "lucide-react";

interface InfoCardContainerProps {
  // walletData?: WalletData[];
  // walletName?: string;
  // pendingTransaction?: number;
  // onUpdate: () => void;
  // loading?: boolean;
}

const InfoCardContainer: React.FC<InfoCardContainerProps> = (
  {
    // walletData = [],
    // walletName = "Default",
    // pendingTransaction,
    // onUpdate,
    // loading,
  },
) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // const handleSeeAllClick = () => {
  //   if (walletData.length > 0) {
  //     setIsModalOpen(true);
  //   }
  // };

  return (
    <>
      <span className="flex flex-row gap-5 w-full justify-between">
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-[#FF7CEB] to-[#FFACF2] rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-account.svg')] bg-no-repeat bg-right bg-contain opacity-30"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span className="text-white">Account</span>
              <EditAccountModal>
                <span className="cursor-pointer">
                  <Image
                    src="/misc/edit-icon.svg"
                    alt="Edit Account"
                    width={25}
                    height={25}
                    style={{ filter: "brightness(0) saturate(100%) invert(100%)" }}
                  />
                </span>
              </EditAccountModal>
            </span>
            <span className="flex flex-row gap-2 items-center">
              <Image src="/dashboard/circle-polypay-icon.svg" alt="Polypay Icon" width={30} height={30} />
              <Image src="/dashboard/polypay-text.svg" alt="Polypay text" width={130} height={130} />
              <span className="text-black px-3 py-1 rounded-2xl bg-[#C2FFCA] ">Default</span>
            </span>
          </div>
        </span>
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-[#CEEFE8] to-[#9DCFF0] rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-pending-tx.svg')] bg-no-repeat bg-right bg-contain"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 pb-0 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span>Pending Transactions</span>
            </span>
            <span className="flex flex-row gap-1 items-center">
              <span className="text-[35px]">03</span>
            </span>
          </div>
        </span>
        <span className="relative flex-1 h-[150px] block bg-gradient-to-r from-[#BBB4F7] to-[#6D2EFF] rounded-xl overflow-hidden">
          <span
            className="absolute right-0 top-0 h-full w-auto bg-[url('/dashboard/bg-signer-list.svg')] bg-no-repeat bg-right bg-contain opacity-30"
            style={{ width: "70%" }}
          />

          <div className="relative z-10 p-3 pb-0 flex flex-col h-full justify-between">
            <span className="flex flex-row justify-between">
              <span className="text-white">Signers List</span>
            </span>
            <span className="flex flex-row gap-1 items-center">
              <span className="text-[35px] text-white">05</span>
            </span>
          </div>
        </span>
      </span>
    </>
  );
};

export default InfoCardContainer;
