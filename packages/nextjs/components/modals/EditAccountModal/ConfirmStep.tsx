"use client";

import React from "react";
import { CONFIRM_DESCRIPTIONS, ConfirmStepProps } from "./types";
import { ArrowLeft, X } from "lucide-react";
import { formatAddress } from "~~/utils/format";

const ConfirmStep: React.FC<ConfirmStepProps> = ({
  mode,
  pendingAdds,
  removedSigners,
  newThreshold,
  totalSignersAfterChanges,
  originalThreshold,
  onBack,
  onClose,
  onSubmit,
  isLoading,
}) => {
  // Determine if threshold changed
  const thresholdChanged = newThreshold !== originalThreshold;

  // Determine description text
  const getDescription = () => {
    if (mode === "ADD") return CONFIRM_DESCRIPTIONS.ADD;
    if (mode === "REMOVE") return CONFIRM_DESCRIPTIONS.REMOVE;
    return CONFIRM_DESCRIPTIONS.THRESHOLD;
  };

  // Format commitment for badge display
  const formatBadgeText = (name: string | null, commitment: string) => {
    const shortCommitment = formatAddress(commitment, { start: 4, end: 4 });
    if (name) {
      return `${name} (${shortCommitment})`;
    }
    return shortCommitment;
  };

  return (
    <div className="flex flex-col bg-grey-0 rounded-2xl border border-grey-200 w-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between h-[70px] px-4 border-b border-grey-200 rounded-t-2xl">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={onBack}
            className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
            disabled={isLoading}
          >
            <ArrowLeft className="w-6 h-6 text-grey-1000" strokeWidth={2.25} />
          </button>

          {/* Title */}
          <span className="text-base font-semibold tracking-tight text-grey-1000">Submit proposal</span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-lg border border-grey-200 bg-grey-0 transition-colors hover:bg-grey-50 disabled:opacity-50"
          disabled={isLoading}
        >
          <X className="w-[18px] h-[18px] text-grey-950" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col px-4 pb-4 gap-2">
        {/* Add signers row */}
        {mode === "ADD" && pendingAdds.length > 0 && (
          <div className="flex items-center py-2 gap-4 flex-wrap">
            <span className="text-sm font-medium tracking-tight text-blue-550 w-[90px]">Add</span>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {pendingAdds.map((signer, index) => (
                <div key={index} className="flex items-center justify-center px-2 py-1 bg-grey-100 rounded-full">
                  <span className="text-xs font-medium tracking-tight text-grey-1000">
                    {formatBadgeText(signer.name, signer.commitment)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remove signers row */}
        {mode === "REMOVE" && removedSigners.length > 0 && (
          <div className="flex items-center py-2 gap-4 flex-wrap">
            <span className="text-sm font-medium tracking-tight text-red-500 w-[90px]">Remove</span>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {removedSigners.map((signer, index) => (
                <div key={index} className="flex items-center justify-center px-2 py-1 bg-grey-100 rounded-full">
                  <span className="text-xs font-medium tracking-tight text-grey-1000">
                    {formatBadgeText(signer.name, signer.commitment)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New threshold row - show if threshold changed or if mode is IDLE (threshold only) */}
        {(thresholdChanged || mode === "IDLE") && (
          <div className="flex items-center py-2 gap-4">
            <span className="text-sm font-medium tracking-tight text-blue-550 w-[90px]">New threshold</span>
            <div className="flex items-center justify-center px-2 py-1 bg-grey-100 rounded-full">
              <span className="text-xs font-medium tracking-tight text-grey-1000">
                {newThreshold}/{totalSignersAfterChanges}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-sm font-medium leading-5 tracking-tight text-grey-600">{getDescription()}</p>
      </div>

      {/* Footer - 68px height */}
      <div className="flex items-center gap-[7px] h-[68px] px-4 pl-5 bg-grey-50 border-t border-grey-200 rounded-b-2xl">
        {/* Cancel button - 90x36px */}
        <button
          onClick={onClose}
          className="w-[90px] h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-grey-100 text-grey-1000 hover:bg-grey-200 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          Cancel
        </button>

        {/* Submit button - flex-1, 36px height */}
        <button
          onClick={onSubmit}
          className="flex-1 h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-pink-350 text-grey-1000 hover:bg-pink-450 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Submitting..." : "Submit proposal"}
        </button>
      </div>
    </div>
  );
};

export default ConfirmStep;
