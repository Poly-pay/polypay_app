"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { useWalletClient } from "wagmi";
import { Button } from "~~/components/ui/button";
import { ModalProps } from "~~/types/modal";

interface ClaimRewardModalProps extends ModalProps {
  amount?: number;
  onConfirm?: () => void;
}

const ClaimRewardModal: React.FC<ClaimRewardModalProps> = ({ isOpen, onClose, amount = 100, onConfirm }) => {
  const { data: walletClient } = useWalletClient();
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} className="w-[555px] h-[356px] p-0 " isCloseButton={false}>
      <div className="relative flex flex-col items-center rounded-[32px] overflow-hidden border border-white -mx-1.5 -my-4">
        {/* Background Image */}
        <Image src="/dashboard/bg-request-feature.png" alt="Background" fill />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-[38px] h-[38px] flex items-center justify-center bg-white border border-grey-200 rounded-lg hover:bg-grey-50 transition-colors z-10"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
              stroke="#363636"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="relative z-1 flex items-center justify-center w-full h-12 pt-4">
          <h2 className="font-barlow font-medium text-2xl leading-[100%] tracking-[-0.03em] text-grey-1000">
            Claim reward
          </h2>
        </div>

        {/* Content */}
        <div className="relative z-1 flex flex-col items-center justify-center px-4 py-8 gap-2 w-full h-[160px]">
          {/* You will receive */}
          <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000">
            You will receive
          </span>

          {/* Amount */}
          <div className="flex items-center gap-2">
            <Image src="/token/zen.svg" alt={"ZEN"} width={32} height={32} className="rounded-full" />
            <span className="font-barlow font-medium text-[40px] leading-[100%] tracking-[-0.03em] text-grey-1000">
              {amount} ZEN
            </span>
          </div>

          {/* To */}
          <span className="font-barlow font-medium text-base leading-[120%] tracking-[-0.03em] text-grey-800 opacity-50">
            To
          </span>

          {/* Address */}
          <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000">
            {walletClient?.account?.address}
          </span>
        </div>

        {/* Footer */}
        <div className="relative z-1 flex items-center w-full px-4 py-4 pl-5 gap-[7px] bg-grey-50 border-t border-grey-200">
          <Button
            onClick={onClose}
            className="w-[90px] h-9 bg-grey-100 hover:bg-grey-200 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 h-9 bg-main-pink hover:bg-main-pink/90 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            Confirm
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default ClaimRewardModal;
