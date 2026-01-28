"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { EditStepProps } from "./types";
import { AlertCircle, Plus, Trash2, X } from "lucide-react";
import { Input } from "~~/components/ui/input";
import { useMetaMultiSigWallet, useModalApp } from "~~/hooks";
import { useAccountStore } from "~~/services/store";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";
import { isDuplicateCommitment, isValidCommitment } from "~~/utils/signer";

const EditStep: React.FC<EditStepProps> = ({
  pendingAdds,
  pendingRemoves,
  threshold,
  showWarning,
  setPendingAdds,
  setPendingRemoves,
  setThreshold,
  setShowWarning,
  existingSigners,
  originalThreshold,
  loading,
  loadingState,
  onNext,
  onClose,
}) => {
  const { openModal } = useModalApp();
  const { currentAccount } = useAccountStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();

  // Derived mode
  const mode = useMemo(() => {
    if (pendingAdds.length > 0) return "ADD";
    if (pendingRemoves.length > 0) return "REMOVE";
    return "IDLE";
  }, [pendingAdds, pendingRemoves]);

  // Computed totals
  const totalSignersAfterChanges = existingSigners.length + pendingAdds.length - pendingRemoves.length;
  const visibleExistingSigners = existingSigners.filter(s => !pendingRemoves.includes(s.commitment));

  // Validation errors for pending adds
  const pendingAddErrors = useMemo(() => {
    return pendingAdds.map((signer, index) => {
      const commitment = signer.commitment.trim();

      // Empty then no show error
      if (!commitment) return null;

      // Check invalid (have letter)
      if (!isValidCommitment(commitment)) {
        return "invalid";
      }

      // Check duplicate with pendingAdds
      if (isDuplicateCommitment(pendingAdds, index)) {
        return "duplicate";
      }

      // Check duplicate with existingSigners
      const isDuplicateWithExisting = existingSigners.some(s => s.commitment.trim() === commitment);
      if (isDuplicateWithExisting) {
        return "duplicate";
      }

      return null;
    });
  }, [pendingAdds, existingSigners]);

  // Check if any validation error exists
  const hasValidationErrors = useMemo(() => {
    return pendingAddErrors.some(error => error !== null);
  }, [pendingAddErrors]);

  // Validation
  const isValid = useMemo(() => {
    if (totalSignersAfterChanges < 1) return false;
    if (threshold < 1 || threshold > totalSignersAfterChanges) return false;

    if (pendingAdds.length > 0) {
      const allValid = pendingAdds.every(s => s.commitment.trim() !== "");
      if (!allValid) return false;
    }

    // Thêm check validation errors
    if (hasValidationErrors) return false;

    const hasChanges = pendingAdds.length > 0 || pendingRemoves.length > 0 || threshold !== originalThreshold;
    if (!hasChanges) return false;

    return true;
  }, [totalSignersAfterChanges, threshold, pendingAdds, pendingRemoves, originalThreshold, hasValidationErrors]);

  // Handlers
  const handleAddNewSigner = () => {
    if (mode === "REMOVE") {
      setShowWarning(true);
      return;
    }
    setPendingAdds([...pendingAdds, { name: "", commitment: "" }]);
  };

  const handleRemoveExisting = (commitment: string) => {
    if (mode === "ADD") {
      setShowWarning(true);
      return;
    }

    if (visibleExistingSigners.length <= 1) {
      notification.error("Cannot remove the last signer");
      return;
    }

    const newPendingRemoves = [...pendingRemoves, commitment];
    setPendingRemoves(newPendingRemoves);

    // Auto-adjust threshold if needed
    const newTotal = existingSigners.length - newPendingRemoves.length;
    if (threshold > newTotal) {
      setThreshold(newTotal);
    }
  };

  const handleRemovePendingAdd = (index: number) => {
    setPendingAdds(pendingAdds.filter((_, i) => i !== index));
  };

  const handleUpdatePendingAdd = (index: number, field: "name" | "commitment", value: string) => {
    const updated = [...pendingAdds];
    updated[index] = { ...updated[index], [field]: value };
    setPendingAdds(updated);
  };

  const handleThresholdChange = (value: number) => {
    if (value >= 1 && value <= totalSignersAfterChanges) {
      setThreshold(value);
    }
  };

  const formatCommitment = (commitment: string) => {
    if (!commitment) return "";
    return `${commitment.slice(0, 24)}...`;
  };

  return (
    <div className="flex flex-col bg-grey-0 rounded-2xl border border-grey-200">
      {/* Header */}
      <div className="flex items-center justify-between h-[70px] px-4 border-b border-grey-200">
        <div className="flex items-center gap-4">
          <Image src="/common/edit-account.svg" alt="Edit account" width={36} height={36} />
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold uppercase tracking-tight text-grey-950">Edit Account</span>
            <div
              className="flex items-center gap-0.5 text-sm cursor-pointer"
              onClick={() => copyToClipboard(metaMultiSigWallet?.address ?? "")}
            >
              <span className="text-pink-350">{currentAccount?.name || "PolyPay"} </span>
              <span className="text-violet-300">
                [{formatAddress(metaMultiSigWallet?.address ?? "", { start: 4, end: 4 })}]
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-lg border border-grey-200 bg-grey-0 transition-colors hover:bg-grey-50 disabled:opacity-50"
          disabled={loading}
        >
          <X className="w-[18px] h-[18px] text-grey-950" />
        </button>
      </div>

      {/* Loading state */}
      {loading && loadingState && (
        <div className="px-4 py-2 bg-blue-50 text-blue-600 text-sm text-center">{loadingState}</div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-6 px-4 py-0">
        {/* Account Signers Section */}
        <div className="flex flex-col gap-4 pt-4">
          {/* Title & Description */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold tracking-tight text-grey-1000">Account signers</h3>
            <p className="text-xs leading-[14px] tracking-tight text-grey-700">
              Addresses added to the signers list below will play an important role in approving future transactions as
              team members.
            </p>
          </div>

          {/* Signer rows */}
          <div className="flex flex-col gap-2">
            {/* Existing signers */}
            {visibleExistingSigners.map(signer => (
              <div key={signer.commitment} className="flex items-center gap-2.5">
                {/* Name field - 150px width */}
                <div className="w-[150px] h-[38px] px-4 rounded-[10px] flex items-center bg-grey-50 border border-grey-200">
                  <span className="text-sm font-medium tracking-tight truncate text-grey-950">
                    {signer.name}
                    {signer.isYou && <span className="ml-1 text-pink-350">(You)</span>}
                  </span>
                </div>

                {/* Commitment field */}
                <div
                  className="flex-1 h-[38px] px-4 rounded-[10px] flex items-center cursor-pointer transition-colors bg-grey-50 border border-grey-200 hover:bg-grey-100"
                  onClick={() => copyToClipboard(signer.commitment)}
                >
                  <span className="text-sm font-medium tracking-tight font-mono truncate text-grey-950">
                    {formatCommitment(signer.commitment)}
                  </span>
                </div>

                {/* Trash icon */}
                <button
                  onClick={() => {
                    openModal("removeSigner", {
                      signer: {
                        name: signer.name,
                        commitment: signer.commitment,
                      },
                      onRemove: () => handleRemoveExisting(signer.commitment),
                    });
                  }}
                  className="p-1 transition-colors hover:opacity-70 disabled:opacity-30"
                  disabled={loading || visibleExistingSigners.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Pending add rows */}
            {pendingAdds.map((signer, index) => (
              <div key={`pending-${index}`} className="flex items-center gap-2.5">
                {/* Name input */}
                <Input
                  value={signer.name}
                  onChange={e => handleUpdatePendingAdd(index, "name", e.target.value)}
                  placeholder="Name"
                  className="w-[150px] h-[38px] px-4 text-sm font-medium tracking-tight rounded-[10px] bg-grey-50 border-grey-200 text-grey-950 placeholder:text-grey-500"
                  disabled={loading}
                />

                {/* Commitment input */}
                <Input
                  value={signer.commitment}
                  onChange={e => handleUpdatePendingAdd(index, "commitment", e.target.value)}
                  className={`flex-1 h-[38px] px-4 text-sm font-medium tracking-tight font-mono rounded-[10px] bg-grey-50 text-grey-950 placeholder:text-grey-500 ${
                    pendingAddErrors[index] ? "border-red-500 border" : "border-grey-200 border"
                  }`}
                  disabled={loading}
                />

                {/* Trash icon */}
                <button
                  onClick={() => handleRemovePendingAdd(index)}
                  className="p-1 transition-colors hover:opacity-70"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* New Signer button */}
          <div className="flex justify-end pr-8.5">
            <button
              onClick={handleAddNewSigner}
              className="h-[28px] px-2 flex items-center gap-2 rounded-lg bg-violet-300 text-grey-0 text-xs font-medium tracking-tight hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
              <span>New Signer</span>
            </button>
          </div>
        </div>

        {/* Threshold Section */}
        <div className="flex flex-col gap-4">
          {/* Title & Description */}
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold tracking-tight text-grey-1000">Threshold</h3>
            <p className="text-xs leading-4 tracking-tight text-grey-700">
              This is the minimum number of confirmations required for a transaction to go through. Anyone on the list
              can approve the transaction as long as the minimum number of approvals is met.
            </p>
          </div>

          {/* Threshold input row */}
          <div className="flex items-center gap-2.5">
            <div className="w-[68px] h-[38px] rounded-[10px] flex items-center justify-center bg-grey-50 border border-grey-200">
              <input
                type="number"
                min={1}
                max={totalSignersAfterChanges}
                value={threshold}
                onChange={e => handleThresholdChange(Number(e.target.value))}
                className="w-full h-full text-center text-sm font-medium tracking-tight bg-transparent outline-none text-grey-1000"
                disabled={loading}
              />
            </div>
            <span className="text-sm font-medium tracking-tight text-grey-1000">
              /out of {totalSignersAfterChanges} signers
            </span>
          </div>
        </div>

        {/* Warning message */}
        {showWarning && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-500">
              <AlertCircle className="w-[14px] h-[14px] text-grey-0" />
            </div>
            <p className="text-sm font-medium leading-5 tracking-tight flex-1 text-orange-500">
              You can only perform either add or remove action at a time. Please save your changes first and wait for
              approval before continuing.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-[7px] h-[68px] px-4 pl-5 mt-4 bg-grey-50 border-t border-grey-200">
        <button
          onClick={onClose}
          className="w-[90px] h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-grey-100 text-grey-1000 hover:bg-grey-200 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          Cancel
        </button>

        <button
          onClick={onNext}
          className="flex-1 h-[36px] flex items-center justify-center rounded-lg text-sm font-medium tracking-tight bg-pink-350 text-grey-1000 hover:bg-pink-450 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !isValid}
        >
          Save changes
        </button>
      </div>
    </div>
  );
};

export default EditStep;
