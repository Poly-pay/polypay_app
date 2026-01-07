"use client";

import React from "react";
import { Signer } from "./NewWalletContainer";
import { ArrowLeft, Trash2 } from "lucide-react";

interface SignersConfirmationsProps {
  className?: string;
  signers: Signer[];
  threshold: number;
  onUpdateSigners: (signers: Signer[]) => void;
  onUpdateThreshold: (threshold: number) => void;
  onGoBack: () => void;
}

const SignersConfirmations: React.FC<SignersConfirmationsProps> = ({
  className,
  signers,
  threshold,
  onUpdateSigners,
  onUpdateThreshold,
  onGoBack,
}) => {
  const handleSignerChange = (index: number, field: keyof Signer, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = { ...newSigners[index], [field]: value };
    onUpdateSigners(newSigners);
  };
  const handleAddSigner = () => {
    onUpdateSigners([...signers, { name: "", commitment: "" }]);
  };

  const handleRemoveSigner = (index: number) => {
    if (signers.length <= 1) return;
    const newSigners = signers.filter((_, i) => i !== index);
    onUpdateSigners(newSigners);

    const validCount = newSigners.filter(s => s?.name?.trim() !== "" && s.commitment.trim() !== "").length;
    if (threshold > validCount && validCount > 0) {
      onUpdateThreshold(validCount);
    }
  };

  return (
    <div
      className={`overflow-hidden relative w-full h-full flex flex-col rounded-lg bg-white border border-divider ${className}`}
    >
      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4 relative z-10 overflow-auto">
        {/* Title */}
        <div className="flex flex-col items-center justify-center pb-4">
          <div className="text-grey-1000 text-6xl text-center font-bold uppercase w-full">create new</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-grey-1000 text-6xl text-center font-bold uppercase">wa</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-grey-1000 text-6xl text-center font-bold uppercase">et</div>
          </div>
        </div>

        {/* Step header */}
        <div className="flex items-center justify-center w-full max-w-2xl flex-col text-center">
          <span className="text-text-primary uppercase text-[26px] font-semibold">2. Signers & Confirmations</span>
        </div>

        {/* Signers list */}
        <div className="w-full max-w-2xl flex flex-col gap-2">
          <div className="text-text-secondary text-[14px] font-medium">Account signers</div>
          <span className="w-[420px] text-[14px] text-gray-700 mb-1">
            Those commitments added to the signers list below will play an important role in approving future
            transactions as team members.
          </span>

          {signers.map((signer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={signer.name}
                onChange={e => handleSignerChange(index, "name", e.target.value)}
                placeholder="Signer Name"
                className="w-[150px] h-[48px] px-4 py-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={signer.commitment}
                onChange={e => handleSignerChange(index, "commitment", e.target.value)}
                placeholder="Signer commitment"
                className="w-[300px] h-[48px] flex-1 px-4 py-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
              />
              {signers.length > 1 && (
                <Trash2 className="h-4 w-4 cursor-pointer" onClick={() => handleRemoveSigner(index)} />
              )}
            </div>
          ))}

          <button
            onClick={handleAddSigner}
            className="flex items-center gap-2 text-white bg-violet-300 hover:bg-violet-300/80 px-3 py-1 rounded-[8px] transition-colors w-fit cursor-pointer"
          >
            <span className="text-xl">+</span>
            <span className="text-[14px] font-medium">New Signer</span>
          </button>
        </div>

        {/* Threshold */}
        <div className="w-full max-w-2xl flex flex-col gap-2">
          <div className="text-text-secondary text-[16px] font-medium">Threshold</div>
          <div className="text-text-secondary text-[14px] text-gray-400">
            This is the minimum number of confirmations required for a transaction to go through. Anyone on the list can
            approve the transaction as long as the minimum number of approvals is met.
          </div>
          <span className="mt-3">
            <input
              className="w-[220px] h-[48px] flex-1 px-4 py-3 mr-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
              placeholder="Enter threshold number"
              onChange={e => {
                const value = Number(e.target.value);
                const maxValue = signers.filter(s => s?.name?.trim() !== "" && s.commitment.trim() !== "").length || 1;

                if (value < 1) {
                  onUpdateThreshold(1);
                } else if (value > maxValue) {
                  onUpdateThreshold(maxValue);
                } else {
                  onUpdateThreshold(value);
                }
              }}
              type="number"
              defaultValue={1}
              max={signers.length}
            />
            <span className="text-gray-600 text-[16px]">/ out of {signers.length} signers</span>
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs mt-4">
          <button
            onClick={onGoBack}
            className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all bg-gray-100 cursor-pointer hover:scale-105 `}
          >
            <ArrowLeft width={24} height={24} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignersConfirmations;
