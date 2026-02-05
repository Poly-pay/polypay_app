"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { useWalletClient } from "wagmi";
import { Button } from "~~/components/ui/button";
import { useClaimRewards, useClaimSummary } from "~~/hooks/api/useClaim";
import { ModalProps } from "~~/types/modal";
import { chain } from "~~/utils/network-config";

type ModalState = "default" | "loading" | "success" | "error";

interface ClaimRewardModalProps extends ModalProps {
  week?: number;
}

const ClaimRewardModal: React.FC<ClaimRewardModalProps> = ({ isOpen, onClose, week }) => {
  const [state, setState] = useState<ModalState>("default");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { data: walletClient } = useWalletClient();
  const { data: claimSummary, isLoading: isLoadingSummary } = useClaimSummary();
  const claimMutation = useClaimRewards();

  const address = walletClient?.account?.address;

  // Get specific week data
  const weekData = claimSummary?.weeks.find(w => w.week === week);
  const zenPrice = claimSummary?.zenPrice ?? 0;

  const handleClose = () => {
    setState("default");
    setTxHash("");
    setErrorMessage("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!address) {
      setErrorMessage("Please connect your wallet first");
      setState("error");
      return;
    }

    if (!week || !weekData || weekData.rewardZen <= 0) {
      setErrorMessage("No rewards to claim for this week");
      setState("error");
      return;
    }

    if (weekData.isClaimed) {
      setErrorMessage("This week has already been claimed");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const result = await claimMutation.mutateAsync({ toAddress: address, week });
      setTxHash(result.txHash);
      setState("success");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to claim rewards. Please try again.");
      setState("error");
    }
  };

  const handleRetry = () => {
    setState("default");
    setErrorMessage("");
  };

  // Loading summary state
  if (isLoadingSummary) {
    return (
      <ModalContainer isOpen={isOpen} onClose={handleClose} className="w-[555px] h-[356px] p-0" isCloseButton={false}>
        <div className="relative flex flex-col items-center rounded-[32px] overflow-hidden border border-white -mx-1.5 -my-4">
          <Image src="/dashboard/bg-request-feature.png" alt="Background" fill />
          <div className="relative z-1 flex items-center justify-center w-full h-full">
            <div className="animate-spin w-8 h-8 border-2 border-main-pink border-t-transparent rounded-full" />
          </div>
        </div>
      </ModalContainer>
    );
  }

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} className="w-[555px] p-0" isCloseButton={false}>
      <div className="relative flex flex-col items-center rounded-[32px] overflow-hidden border border-white -mx-1.5 -my-4">
        {/* Background Image */}
        <Image src="/dashboard/bg-request-feature.png" alt="Background" fill />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 w-[38px] h-[38px] flex items-center justify-center bg-white border border-grey-200 rounded-lg hover:bg-grey-50 transition-colors z-10"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
              stroke="#363636"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="relative z-1 flex items-center justify-center w-full h-12 pt-4">
          <h2 className="font-barlow font-medium text-2xl leading-[100%] tracking-[-0.03em] text-grey-1000">
            Claim reward
          </h2>
        </div>

        {/* Content */}
        <div className="relative z-1 flex flex-col items-center justify-center px-4 py-6 gap-4 w-full min-h-[200px]">
          {/* Default State */}
          {state === "default" && (
            <>
              {weekData && !weekData.isClaimed ? (
                <>
                  {/* Week Badge */}
                  <div className="px-6 py-2 bg-white rounded-lg border border-grey-200">
                    <span className="font-barlow font-medium text-base text-grey-1000">Week {week}</span>
                  </div>

                  {/* You will receive */}
                  <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000">
                    You will receive
                  </span>

                  {/* Amount */}
                  <div className="flex items-center gap-2">
                    <Image src="/token/zen.svg" alt="ZEN" width={40} height={40} className="rounded-full" />
                    <span className="font-barlow font-medium text-[48px] leading-[100%] tracking-[-0.03em] text-grey-1000">
                      {weekData.rewardZen.toFixed(4)}
                    </span>
                    <span className="font-barlow font-medium text-[48px] leading-[100%] tracking-[-0.03em] text-grey-1000">
                      ZEN
                    </span>
                  </div>

                  {/* Price info */}
                  <span className="font-barlow text-base text-grey-600">
                    ~${weekData.rewardUsd.toFixed(2)} (1 ZEN = ${zenPrice.toFixed(2)})
                  </span>

                  {/* Divider with "To" */}
                  <div className="flex items-center gap-3 w-full max-w-[400px]">
                    <div className="flex-1 h-px bg-grey-300" />
                    <span className="font-barlow text-base text-grey-500">To</span>
                    <div className="flex-1 h-px bg-grey-300" />
                  </div>

                  {/* Address */}
                  <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000 break-all text-center px-4">
                    {address || "Connect wallet"}
                  </span>
                </>
              ) : (
                <span className="font-barlow font-medium text-base text-grey-600">
                  {weekData?.isClaimed ? "This week has already been claimed" : "No rewards to claim for this week"}
                </span>
              )}
            </>
          )}

          {/* Loading State */}
          {state === "loading" && (
            <>
              <div className="animate-spin w-12 h-12 border-3 border-main-pink border-t-transparent rounded-full" />
              <span className="font-barlow font-medium text-base text-grey-1000">Processing claim...</span>
              <span className="font-barlow text-sm text-grey-600">Please wait while we send your ZEN tokens</span>
            </>
          )}

          {/* Success State */}
          {state === "success" && (
            <>
              <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="#22C55E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-barlow font-medium text-xl text-grey-1000">Claim Successful!</span>
              <span className="font-barlow text-sm text-grey-600 text-center">
                Your ZEN tokens have been sent to your wallet
              </span>
              <a
                href={`${chain.blockExplorers.default.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-barlow text-sm text-violet-500 hover:text-violet-600 underline"
              >
                View on Explorer →
              </a>
            </>
          )}

          {/* Error State */}
          {state === "error" && (
            <>
              <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6 18L18 6M6 6L18 18"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-barlow font-medium text-xl text-grey-1000">Claim Failed</span>
              <span className="font-barlow text-sm text-grey-600 text-center max-w-[300px]">{errorMessage}</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-1 flex items-center w-full px-4 py-4 pl-5 gap-[7px] bg-grey-50 border-t border-grey-200">
          {state === "default" && (
            <>
              <Button
                onClick={handleClose}
                className="w-[90px] h-9 bg-grey-100 hover:bg-grey-200 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!address || !weekData || weekData.isClaimed || weekData.rewardZen <= 0}
                className="flex-1 h-9 bg-main-pink hover:bg-main-pink/90 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </Button>
            </>
          )}

          {state === "loading" && (
            <Button
              disabled
              className="flex-1 h-9 bg-grey-100 text-grey-500 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg cursor-not-allowed"
            >
              Processing...
            </Button>
          )}

          {state === "success" && (
            <Button
              onClick={handleClose}
              className="flex-1 h-9 bg-main-pink hover:bg-main-pink/90 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
            >
              Close
            </Button>
          )}

          {state === "error" && (
            <>
              <Button
                onClick={handleClose}
                className="w-[90px] h-9 bg-grey-100 hover:bg-grey-200 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRetry}
                className="flex-1 h-9 bg-main-pink hover:bg-main-pink/90 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
              >
                Retry
              </Button>
            </>
          )}
        </div>
      </div>
    </ModalContainer>
  );
};

export default ClaimRewardModal;
