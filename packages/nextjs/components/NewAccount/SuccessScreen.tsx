"use client";

import React, { useState } from "react";
import Image from "next/image";
import ReceiveModal from "../modals/QRAddressReceiverModal";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { notification } from "~~/utils/scaffold-eth";

interface SuccessScreenProps {
  className?: string;
  accountName: string;
  accountAddress: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ className, accountName, accountAddress }) => {
  const router = useAppRouter();
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(accountAddress);
    notification.success("Account address copied to clipboard!");
  };

  const handleSeeWallet = () => {
    router.goToDashboard();
  };

  return (
    <div
      className={`overflow-hidden relative w-full h-full flex flex-col rounded-lg bg-background ${className} border border-divider`}
    >
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4 relative z-10">
        <div className="flex flex-col items-center justify-center pb-8">
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">successfully</div>
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">created</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">wa</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">et</div>
          </div>
        </div>

        <div className="h-[150px] w-full max-w-[528px] flex flex-col items-center justify-center relative">
          <div className="relative w-full h-full">
            <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
            <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
          </div>
          <Image
            src="/new-wallet/apple.svg"
            alt="Success Icon"
            width={75}
            height={75}
            className="rounded-full border-dashed border-[1px] border-primary shadow-[0_0_20px_rgba(255,124,235,0.5)] absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 w-full max-w-lg border-[1px] border-gray-200 shadow-sm">
          <div className="text-center">
            <h3 className="text-grey-900 text-[32px] font-medium mb-4">{accountName}</h3>
            <span className="block border-b-[1px] border-gray-200 w-full "></span>

            <div
              className="text-[24px] text-violet-300 leading-relaxed break-all px-2 cursor-pointer hover:bg-gray-200 rounded py-2 transition-colors font-repetition"
              onClick={handleCopyAddress}
              title="Click to copy"
            >
              {accountAddress}
            </div>

            <span className="block border-b-[1px] border-gray-200 w-full mb-4 "></span>

            <div className="flex gap-4 items-center justify-center w-full">
              <button
                onClick={handleSeeWallet}
                className="flex-1 bg-grey-1000 flex items-center justify-center px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="font-semibold text-[16px] text-center text-white">See your wallet</span>
              </button>
              <button
                onClick={() => setIsReceiveModalOpen(true)}
                className="flex-1 bg-primary flex items-center justify-center px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="font-semibold text-[16px] text-center text-white">Fund your wallet</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReceiveModal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} address={accountAddress} />
    </div>
  );
};

export default SuccessScreen;
