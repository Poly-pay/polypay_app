"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { useAccount, useMetaMultiSigWallet } from "~~/hooks";
import { ModalProps } from "~~/types/modal";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";

const SignerListModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { data: account } = useAccount(metaMultiSigWallet?.address || "");

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col bg-grey-0 rounded-2xl border border-grey-200">
        {/* Header - 70px */}
        <div className="flex items-center justify-between px-3 h-[70px]">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 flex items-center justify-center">
              <Image src="/common/create-modal-icon.svg" alt="Signer List" width={36} height={36} />
            </div>
            <span className="text-base font-semibold text-grey-950 uppercase tracking-tight">Signer List</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col px-4 pb-6">
          {/* Label */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-sm font-medium text-grey-500 tracking-tight">All signers</span>
            <span className="text-sm font-medium text-pink-350">{account?.signers.length}</span>
          </div>

          {/* Signer List - scrollable */}
          <div className="flex flex-col max-h-[240px] overflow-y-auto">
            {account?.signers.map((signer, index) => (
              <div
                key={signer.commitment || index}
                className="flex items-center gap-[7px] px-3 py-2 h-12 rounded-xl hover:bg-grey-50 transition-colors"
              >
                {/* Avatar */}
                <Image
                  src="/avatars/default-avt.svg"
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />

                {/* Name & Commitment */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  {signer.name ? (
                    <>
                      <span className="text-sm font-medium text-grey-950 tracking-tight truncate">{signer.name}</span>
                      <span className="text-xs text-grey-600 tracking-tight">
                        {formatAddress(signer.commitment, { start: 4, end: 4 })}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-grey-950 tracking-tight truncate">
                      {formatAddress(signer.commitment, { start: 4, end: 4 })}
                    </span>
                  )}
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(signer.commitment)}
                  className="flex items-center justify-center px-4 py-2 h-6 bg-grey-100 rounded-full hover:bg-grey-200 transition-colors flex-shrink-0"
                >
                  <span className="text-xs font-medium text-grey-1000 tracking-tight">Copy</span>
                </button>
              </div>
            ))}

            {/* Empty state */}
            {account?.signers.length === 0 && (
              <div className="flex items-center justify-center py-8 text-grey-500 text-sm">No signers found</div>
            )}
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default SignerListModal;
