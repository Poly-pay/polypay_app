"use client";

import React from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { IWalletFormData } from "~~/types/form/wallet";

interface SignersConfirmationsProps {
  className?: string;
  form: UseFormReturn<IWalletFormData>;
  onGoBack: () => void;
}

const SignersConfirmations: React.FC<SignersConfirmationsProps> = ({ className, form, onGoBack }) => {
  const { register, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "signers",
  });

  const signers = watch("signers");
  const threshold = watch("threshold");

  const handleAddSigner = () => {
    append({ name: "", commitment: "" });
  };

  const handleRemoveSigner = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);

    const newSigners = signers.filter((_, i) => i !== index);
    const validCount = newSigners.filter(s => s?.commitment?.trim() !== "").length;
    if (threshold > validCount && validCount > 0) {
      setValue("threshold", validCount);
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
          <div className="text-[#1E1E1E] text-6xl text-center font-bold uppercase w-full">create new</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-[#1E1E1E] text-6xl text-center font-bold uppercase">wa</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-[#1E1E1E] text-6xl text-center font-bold uppercase">et</div>
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

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                type="text"
                {...register(`signers.${index}.name`)}
                placeholder="Signer Name"
                className="w-[150px] h-[48px] px-4 py-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                {...register(`signers.${index}.commitment`)}
                placeholder="Signer commitment"
                className="w-[300px] h-[48px] flex-1 px-4 py-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
              />
              {fields.length > 1 && (
                <Trash2 className="h-4 w-4 cursor-pointer" onClick={() => handleRemoveSigner(index)} />
              )}
            </div>
          ))}

          <button
            onClick={handleAddSigner}
            className="flex items-center gap-2 text-white bg-[#6D2EFF] hover:bg-[#6D2EFF]/80 px-3 py-1 rounded-[8px] transition-colors w-fit cursor-pointer"
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
              {...register("threshold", {
                valueAsNumber: true,
                onChange: e => {
                  const value = Number(e.target.value);
                  const maxValue = signers.filter(s => s?.commitment?.trim() !== "").length || 1;

                  if (value < 1) {
                    setValue("threshold", 1);
                  } else if (value > maxValue) {
                    setValue("threshold", maxValue);
                  }
                },
              })}
              type="number"
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
