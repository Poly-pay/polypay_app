"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { useWalletClient } from "wagmi";
import { Button } from "~~/components/ui/button";
import { useClaimRewards, useClaimSummary } from "~~/hooks/api/useClaim";
import { ModalProps } from "~~/types/modal";
import { chain } from "~~/utils/network-config";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

type ModalState = "default" | "loading" | "success" | "error";

const ClaimRewardModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<ModalState>("default");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { data: walletClient } = useWalletClient();
  const { data: claimSummary, isLoading: isLoadingSummary } = useClaimSummary();
  const claimMutation = useClaimRewards();

  const address = walletClient?.account?.address;

  // Filter unclaimed weeks
  const unclaimedWeeks = claimSummary?.weeks.filter(w => !w.isClaimed) ?? [];

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

    if (!claimSummary || claimSummary.totalZen <= 0) {
      setErrorMessage("No rewards to claim");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const result = await claimMutation.mutateAsync({ toAddress: address });
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
              {/* Breakdown */}
              {unclaimedWeeks.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-[400px] max-h-[120px] overflow-y-auto">
                  {unclaimedWeeks.map(week => (
                    <div key={week.week} className="flex items-center justify-between px-3 py-2 bg-white/50 rounded-lg">
                      <span className="font-barlow font-medium text-sm text-grey-1000">Week {week.week}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-barlow text-sm text-grey-600">${week.rewardUsd.toFixed(2)}</span>
                        <span className="font-barlow text-sm text-grey-400">→</span>
                        <span className="font-barlow font-medium text-sm text-grey-1000">
                          {week.rewardZen.toFixed(4)} ZEN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {unclaimedWeeks.length > 0 ? (
                <>
                  <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000">
                    You will receive
                  </span>
                  <div className="flex items-center gap-2">
                    <Image src="/token/zen.svg" alt="ZEN" width={32} height={32} className="rounded-full" />
                    <span className="font-barlow font-medium text-[40px] leading-[100%] tracking-[-0.03em] text-grey-1000">
                      {claimSummary?.totalZen.toFixed(4)} ZEN
                    </span>
                  </div>
                  <span className="font-barlow text-xs text-grey-600">
                    ≈ ${claimSummary?.totalUsd.toFixed(2)} (ZEN @ ${claimSummary?.zenPrice.toFixed(2)})
                  </span>
                  <span className="font-barlow font-medium text-base leading-[120%] tracking-[-0.03em] text-grey-800 opacity-50">
                    To
                  </span>
                  <span className="font-barlow font-medium text-base leading-[100%] tracking-[-0.03em] text-grey-1000">
                    {address || "Connect wallet"}
                  </span>
                </>
              ) : (
                <span className="font-barlow font-medium text-base text-grey-600">No rewards to claim</span>
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
                href={getBlockExplorerTxLink(chain.id, txHash)}
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
                disabled={!address || unclaimedWeeks.length === 0}
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
