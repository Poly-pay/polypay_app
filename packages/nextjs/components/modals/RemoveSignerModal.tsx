"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { X } from "lucide-react";
import { ModalProps } from "~~/types/modal";

interface RemoveSignerModalProps extends ModalProps {
  signer?: {
    name?: string | null;
    commitment: string;
  };
  onRemove?: () => void;
}

const RemoveSignerModal: React.FC<RemoveSignerModalProps> = ({ isOpen, onClose, signer, onRemove }) => {
  const formatCommitment = (commitment: string) => {
    if (!commitment) return "";
    return `${commitment.slice(0, 4)}...${commitment.slice(-3)}`;
  };

  const handleRemove = () => {
    onRemove?.();
    onClose();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} className="sm:max-w-[500px] p-0" isCloseButton={false}>
      <div className="flex flex-col items-center bg-grey-0 rounded-2xl border border-grey-200">
        {/* Header - 70px */}
        <div className="flex items-center justify-between w-full h-[70px] px-3 border-b border-grey-200 rounded-t-2xl">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <Image src="/common/confirm.svg" alt="Confirm" width={36} height={36} />

            {/* Title & Subtitle */}
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold uppercase tracking-tight text-grey-950">Confirmation</span>
              <span className="text-sm font-normal tracking-tight text-red-500">
                Delete{" "}
                <span className="text-main-navy-blue">
                  [{signer?.name || "Signer"}({formatCommitment(signer?.commitment || "")})]
                </span>
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-lg bg-grey-0 transition-colors hover:bg-grey-50"
          >
            <X className="w-[18px] h-[18px] text-grey-950" />
          </button>
        </div>

        {/* Image */}
        <div className="relative w-[200px] h-[200px] my-4">
          {/* Background circle with grid lines */}
          <div className="absolute inset-0 rounded-full border border-grey-100" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-grey-100" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-grey-100" />

          {/* Image */}
          <Image
            src="/batch/remove.svg"
            alt="Delete Signer"
            width={145}
            height={155}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </div>

        {/* Signer Info Badge */}
        {signer && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-500 rounded-full mb-3">
            <span className="text-base font-normal tracking-tight text-grey-1000 flex-1">
              {signer.name || "Unknown"}
            </span>
            <div className="flex items-center justify-center px-1.5 py-1 bg-red-500 rounded-full">
              <span className="text-xs font-medium tracking-tight text-grey-0">
                {formatCommitment(signer.commitment)}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="px-5 mb-5">
          <p className="text-xl font-medium leading-[110%] tracking-tight text-center text-red-500">
            Are you sure you want to delete this signer from account?
          </p>
        </div>

        {/* Footer - 68px */}
        <div className="flex items-center gap-[7px] w-full h-[68px] px-4 pl-5 bg-grey-50 border-t border-grey-200 rounded-b-2xl">
          {/* Cancel button - 90x36px */}
          <button
            onClick={onClose}
            className="w-[90px] h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-grey-100 text-grey-1000 hover:bg-grey-200 transition-colors"
          >
            Cancel
          </button>

          {/* Delete button - flex-1 */}
          <button
            onClick={handleRemove}
            className="flex-1 h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-red-500 text-grey-0 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default RemoveSignerModal;
