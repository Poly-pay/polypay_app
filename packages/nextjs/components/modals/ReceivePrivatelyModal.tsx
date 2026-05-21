"use client";

import React, { useState } from "react";
import ModalContainer from "./ModalContainer";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Shield, X } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { stealthKeys, useStealthStatus } from "~~/hooks/api/useStealthStatus";
import { ModalProps } from "~~/types/modal";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";

const UMBRA_SETUP_URL = "https://app.umbra.cash";

// We point users to app.umbra.cash for stealth key registration instead of
// hosting our own onboarding flow. PolyPay only observes the registry on
// chain and unlocks stealth sends once the recipient has registered.
const ReceivePrivatelyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const stealthStatus = useStealthStatus(address ?? null);
  const [isRechecking, setIsRechecking] = useState(false);

  const isRegistered = stealthStatus.data?.registered === true;

  const handleRecheck = async () => {
    if (!address) return;
    setIsRechecking(true);
    try {
      await queryClient.invalidateQueries({ queryKey: stealthKeys.status(address.toLowerCase()) });
      const fresh = await queryClient.fetchQuery({ queryKey: stealthKeys.status(address.toLowerCase()) });
      if (!(fresh as { registered?: boolean })?.registered) {
        notification.info("Not registered yet. Complete setup on Umbra and try again.");
      }
      // If registered, the component will re-render into the success state.
    } finally {
      setIsRechecking(false);
    }
  };

  const handleCopy = () => {
    if (!address) return;
    copyToClipboard(address, "Address copied");
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      isCloseButton={false}
      className="bg-white rounded-3xl w-[min(480px,92vw)] p-0 shadow-modal overflow-hidden"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-main-violet" />
            <span className="text-grey-1000 text-base font-semibold">Receive privately</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-grey-1000" />
          </button>
        </div>

        {isRegistered ? (
          /* ---- Success state ---- */
          <>
            <div className="flex flex-col items-center gap-4 px-5 pt-2 pb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-9 h-9 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-grey-1000 text-2xl font-semibold uppercase tracking-tight">You&apos;re all set</h3>
              <p className="text-sm text-grey-600 text-center max-w-[320px]">
                This wallet can receive private payments. Share your wallet address with senders.
              </p>
              {address && (
                <div className="w-full mt-2 flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl bg-grey-50 border border-grey-100 text-sm font-mono text-grey-900 break-all">
                    {address}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-grey-200 hover:bg-grey-50 cursor-pointer shrink-0"
                    aria-label="Copy address"
                  >
                    <Copy className="w-4 h-4 text-grey-1000" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-grey-100">
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-main-pink hover:bg-pink-550 text-grey-1000 rounded-xl cursor-pointer"
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          /* ---- Setup state ---- */
          <>
            <div className="flex flex-col items-center gap-4 px-5 pt-2 pb-5">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-main-violet" />
              </div>
              <div className="text-center">
                <h3 className="text-grey-1000 text-lg font-semibold">Set up your wallet on Umbra</h3>
                <p className="text-sm text-grey-600 mt-1">One-time setup on Base mainnet (~$0.01 gas)</p>
              </div>

              {/* Steps card */}
              <div className="w-full rounded-2xl bg-grey-50 border border-grey-100 p-4 flex flex-col gap-2.5">
                <StepRow num={1} text="Open app.umbra.cash" />
                <StepRow num={2} text="Connect this same wallet on Base mainnet" />
                <StepRow num={3} text="Follow Umbra's setup flow to publish your stealth keys" />
                <StepRow num={4} text={`Return here and click "I've completed setup"`} />
              </div>

              {/* Wallet to register */}
              {address && (
                <div className="w-full">
                  <span className="block text-xs text-grey-600 mb-1.5">Wallet to register</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 rounded-xl bg-grey-50 border border-grey-100 text-sm font-mono text-grey-900">
                      {formatAddress(address, { start: 10, end: 8 })}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-grey-200 hover:bg-grey-50 cursor-pointer shrink-0"
                      aria-label="Copy address"
                    >
                      <Copy className="w-4 h-4 text-grey-1000" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-grey-100">
              <a
                href={UMBRA_SETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 inline-flex items-center justify-center gap-2 bg-main-pink hover:bg-pink-550 text-grey-1000 rounded-xl cursor-pointer text-sm font-medium"
              >
                Open app.umbra.cash
                <ExternalLink className="w-4 h-4" />
              </a>
              <Button
                type="button"
                onClick={handleRecheck}
                disabled={isRechecking || !address}
                className="flex-1 h-11 bg-white hover:bg-grey-50 text-grey-1000 border border-grey-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isRechecking ? "Checking…" : "I've completed setup"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalContainer>
  );
};

interface StepRowProps {
  num: number;
  text: string;
}

const StepRow: React.FC<StepRowProps> = ({ num, text }) => (
  <div className="flex items-start gap-3">
    <div className="w-6 h-6 rounded-full bg-main-violet text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
      {num}
    </div>
    <span className="text-sm text-grey-900 leading-6">{text}</span>
  </div>
);

export default ReceivePrivatelyModal;
