"use client";

import React from "react";
import { ArrowRight, ArrowRightLeft, Repeat } from "lucide-react";

interface WalletNameProps {
  className?: string;
  name: string;
  onUpdateName: (name: string) => void;
  onNextStep: () => void;
  isValid: boolean;
}

export default function WalletName({ className, name, onUpdateName, onNextStep, isValid }: WalletNameProps) {
  const handleGenerateName = () => {
    const randomName = `Wallet-${Math.random().toString(36).substring(2, 8)}`;
    onUpdateName(randomName);
  };

  return (
    <div
      className={`overflow-hidden relative w-full h-full flex flex-col rounded-lg bg-white ${className} border border-divider`}
    >
      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4 relative z-10">
        {/* Title */}
        <div className="flex flex-col items-center justify-center pb-8">
          <div className="text-[#1E1E1E] text-6xl text-center font-semibold uppercase w-full">create new</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-[#1E1E1E] text-6xl text-center font-semibold uppercase">wa</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-[#1E1E1E] text-6xl text-center font-semibold uppercase">et</div>
          </div>
        </div>

        {/* Step description */}
        <div className="flex items-center justify-center w-full max-w-2xl flex-col text-center">
          <span className="text-text-primary uppercase text-[26px] font-semibold mb-4">1. Basic setup</span>
          <span className="text-text-secondary text-[16px] text-gray-500">
            This is the basic setup of the wallet, please enter the wallet name in the box below.
          </span>
          <span className="text-text-secondary text-[16px] text-gray-500">
            Or click the generate button next to it to automatically generate the wallet name.
          </span>
        </div>

        {/* Name input */}
        <div className="flex gap-2 items-center justify-center w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={e => {
                if (e.target.value.length <= 30) {
                  onUpdateName(e.target.value);
                }
              }}
              maxLength={30}
              placeholder="Your wallet name"
              className="w-[400px] h-[48px] flex-1 px-4 py-3 rounded-[16px] border border-gray-200 bg-gray-50 text-[16px] focus:outline-none focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-gray-400">
              {name.length}/30
            </span>
          </div>

          <Repeat onClick={handleGenerateName} width={16} height={16} className="cursor-pointer ml-2" />
        </div>

        {/* Next button */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs mt-4">
          <button
            onClick={onNextStep}
            disabled={!isValid}
            className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all bg-gray-100 ${
              isValid ? "cursor-pointer hover:scale-105" : "cursor-not-allowed"
            }`}
          >
            <ArrowRight width={24} height={24} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
