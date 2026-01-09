"use client";

import React from "react";
import { ArrowRight, Repeat } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { IAccountFormData } from "~~/types/form/account";

interface AccountNameProps {
  className?: string;
  form: UseFormReturn<IAccountFormData>;
  onNextStep: () => void;
  isValid: boolean;
}

export default function AccountName({ className, form, onNextStep, isValid }: AccountNameProps) {
  const { register, setValue, watch } = form;
  const name = watch("name");

  const handleGenerateName = () => {
    const randomName = `Account-${Math.random().toString(36).substring(2, 8)}`;
    setValue("name", randomName);
  };

  return (
    <div
      className={`overflow-hidden relative w-full h-full flex flex-col rounded-lg bg-white ${className} border border-divider`}
    >
      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4 relative z-10">
        {/* Title */}
        <div className="flex flex-col items-center justify-center pb-8">
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">create new</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">acc</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">unt</div>
          </div>
        </div>

        {/* Step description */}
        <div className="flex items-center justify-center w-full max-w-2xl flex-col text-center">
          <span className="text-text-primary uppercase text-[26px] font-semibold mb-4">1. Basic setup</span>
          <span className="text-text-secondary text-[16px] text-gray-500">
            This is the basic setup of the account, please enter the account name in the box below.
          </span>
          <span className="text-text-secondary text-[16px] text-gray-500">
            Or click the generate button next to it to automatically generate the account name.
          </span>
        </div>

        {/* Name input */}
        <div className="flex gap-2 items-center justify-center w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              {...register("name", {
                maxLength: 30,
              })}
              maxLength={30}
              placeholder="Your account name"
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
