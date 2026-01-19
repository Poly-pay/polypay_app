"use client";

import React from "react";
import Image from "next/image";
import { ISigner } from "~~/types/form/account";
import { getValidSigners } from "~~/utils/signer";

interface StatusContainerProps {
  className?: string;
  accountName: string;
  currentStep: number;
  signers: ISigner[];
  threshold: number;
  onCreateAccount: () => void;
  loading: boolean;
  isFormValid: boolean;
}

const StatusContainer: React.FC<StatusContainerProps> = ({
  className,
  accountName,
  currentStep,
  signers,
  threshold,
  onCreateAccount,
  loading,
  isFormValid,
}) => {
  const validSignersToShow = getValidSigners(signers);
  return (
    <div
      className={`bg-white relative rounded-lg h-full flex flex-col ${className} border border-divider justify-between`}
    >
      <div className="px-5 flex flex-col h-full justify-start gap-4 py-4">
        {/* Step Indicators */}
        <div className="flex gap-2 items-center justify-start">
          {/* Step 1 */}
          <div
            className={`h-8 rounded-full flex items-center justify-center transition-all border-white border-[2px] shaddow-[#5A5A5A40] shadow-lg ${
              currentStep === 1 ? "bg-violet-300 w-24 " : "bg-green-500 w-8"
            }`}
          >
            <span className="text-white font-bold text-[16px]">{currentStep > 1 ? "✓" : "1"}</span>
          </div>

          {/* Step 2 */}
          <div
            className={`h-8 rounded-full flex items-center justify-center transition-all border-white border-[2px] shaddow-[#5A5A5A40] shadow-lg ${
              currentStep === 2 ? "bg-violet-300 w-24" : "bg-gray-200 w-8"
            }`}
          >
            <span className={`text-[16px] ${currentStep === 2 ? "text-white" : "text-gray-400"}`}>2</span>
          </div>
        </div>

        {/* Account Name Card */}
        <div className="bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover rounded-2xl w-full flex flex-col items-center justify-center relative h-[200px] gap-2 overflow-hidden p-3">
          <Image
            src="/new-account/account-avatar.svg"
            alt="Account"
            className="w-50 h-50 opacity-80"
            width={200}
            height={200}
          />
          <span className="text-white text-[22px] py-1 font-semibold px-4 text-center w-[80%] rounded-lg bg-[#00000078]">
            {accountName || "Your account name"}
          </span>
        </div>

        {/* Signers Info Section */}
        <div className="bg-gray-50 rounded-xl w-full border border-gray-200 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <span className="text-grey-1000 text-[16px] font-semibold">
              {currentStep === 1
                ? "2. Signers & Confirmations"
                : `2. Signers & Confirmations (${validSignersToShow.length})`}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {currentStep === 1 ? (
              // Step 1 - Placeholder
              <div className="flex flex-col gap-3 items-center justify-center h-full">
                <Image src="/new-account/frame.svg" alt="Setup" className="w-25 h-25" width={100} height={100} />
                <span className="text-grey-1000 text-[14px]">Setup on next step</span>
              </div>
            ) : (
              // Step 2 - Show signers
              <div className="flex flex-col gap-3">
                {validSignersToShow.length > 0 ? (
                  <>
                    {validSignersToShow.map((signer, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-[12px] font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-gray-700 font-medium">
                            {signer.name || `Signer ${index + 1}`}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 truncate">
                            {signer.commitment.slice(0, 12)}...{signer.commitment.slice(-8)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Threshold info */}
                    {isFormValid && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-blue-700 text-[13px]">
                          Threshold: <strong>{threshold}</strong> of <strong>{validSignersToShow.length}</strong>{" "}
                          signers required
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-gray-400 text-[14px]">Add signers</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="bg-gray-50 w-full px-5 py-4 border-t border-gray-200">
        <button
          onClick={onCreateAccount}
          disabled={currentStep < 2 || loading || !isFormValid}
          className={`flex items-center justify-center px-5 py-3 rounded-xl w-full transition-all ${
            currentStep == 2 && isFormValid && !loading
              ? "bg-primary hover:shadow-lg cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          <span
            className={`flex items-center gap-3 font-semibold text-[16px] ${isFormValid && !loading ? "text-black" : "text-white"}`}
          >
            {loading ? "Creating your account..." : "Create your account"}
            {loading && (
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-white border-t-transparent" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StatusContainer;
