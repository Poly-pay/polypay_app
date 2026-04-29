"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { useModalApp } from "~~/hooks/app/useModalApp";
import type { ModalProps } from "~~/types/modal";

export interface ReceiveMethodModalProps extends ModalProps {
  multisigAddress?: `0x${string}`;
  multisigChainId?: number;
}

const ReceiveMethodModal: React.FC<ReceiveMethodModalProps> = ({
  isOpen,
  onClose,
  multisigAddress,
  multisigChainId,
}) => {
  const { openModal } = useModalApp();

  const handleQR = () => {
    onClose();
    openModal("qrAddressReceiver", { address: multisigAddress });
  };

  const handleFromWallet = () => {
    onClose();
    openModal("depositX402", { multisigAddress, multisigChainId });
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Select a receive method"
      isCloseButton
      className="bg-white rounded-3xl w-[min(560px,92vw)] px-5 py-5 shadow-modal"
    >
      <div className="flex flex-col gap-3 pt-6">
        {/* Option 1 — QR */}
        <button
          type="button"
          onClick={handleQR}
          className="flex items-center gap-4 p-4 rounded-2xl bg-grey-50 hover:bg-grey-100 transition-colors text-left cursor-pointer"
        >
          <Image src="/icons/receive-method/qr.svg" alt="QR" width={48} height={48} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-grey-1000 text-base font-semibold leading-6">Receive via QR (Any token)</div>
            <div className="text-grey-600 text-sm leading-5">
              Share your QR code to receive tokens from another wallet
            </div>
          </div>
          <Image
            src="/icons/arrows/arrow-right-purple.svg"
            alt="Arrow right"
            width={20}
            height={20}
            className="shrink-0"
          />
        </button>

        {/* Option 2 — From Wallet (USDC only) */}
        <button
          type="button"
          onClick={handleFromWallet}
          className="flex items-center gap-4 p-4 rounded-2xl bg-grey-50 hover:bg-grey-100 transition-colors text-left cursor-pointer"
        >
          <Image src="/icons/receive-method/wallet.svg" alt="Wallet" width={48} height={48} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-grey-1000 text-base font-semibold leading-6">
              <span>From Wallet (USDC only)</span>
              <Image src="/icons/receive-method/agent.svg" alt="Agent" width={20} height={20} className="shrink-0" />
            </div>
            <div className="text-grey-600 text-sm leading-5">Transfer from your connected wallet</div>
          </div>
          <Image
            src="/icons/arrows/arrow-right-purple.svg"
            alt="Arrow right"
            width={20}
            height={20}
            className="shrink-0"
          />
        </button>
      </div>
    </ModalContainer>
  );
};

export default ReceiveMethodModal;
