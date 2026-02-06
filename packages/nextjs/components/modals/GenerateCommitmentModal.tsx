"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import ModalContainer from "./ModalContainer";
import { X } from "lucide-react";
import DecryptedText from "~~/components/effects/DecryptedText";
import { useAuth } from "~~/hooks";
import { DecoreCircleIcon } from "~~/icons/DecoreCircleIcon";
import { ModalProps } from "~~/types/modal";
import { copyToClipboard } from "~~/utils/copy";
import { notification } from "~~/utils/scaffold-eth";

const GenerateCommitmentModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { login, isLoading, error, commitment } = useAuth();

  const handleClose = () => {
    if (isLoading) return; // Prevent close when loading
    onClose();
  };

  const handleGenerateAndLogin = async () => {
    const success = await login();
    if (!success) {
      notification.error(error || "Login failed. Please try again.");
    }
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} className="w-[500px] p-0" isCloseButton={false}>
      <div className="flex flex-col bg-white rounded-lg overflow-hidden -mx-1.5 -my-4">
        <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
          <div className="flex items-center gap-2">
            <DecoreCircleIcon width={36} height={36} color="#6D2EFF" />
            <span className="flex flex-col">
              <span className="font-semibold text-gray-900 uppercase">Generate commitment</span>
            </span>
          </div>
          {commitment && (
            <Button
              size="sm"
              className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center p-8 text-center space-y-3 bg-gray-100">
          <div className="h-[200px] w-full max-w-[200px] flex items-center justify-center relative">
            <div className="relative w-full h-full"></div>
            <div className="absolute w-50 h-50 rounded-full border-[1px] border-gray-300">
              <Image src="/commitment/key.svg" alt="Development in progress" fill className="object-contain" />
            </div>
          </div>

          {commitment ? (
            <>
              <h3 className="font-semibold text-gray-900 text-2xl uppercase">Your commitment is on the way</h3>
              <span className="block text-sm text-gray-500 leading-relaxed text-[13px]">
                Your commitment is being created for you. Use the commitment to create a multisig account or provide
                this to the account creator to add you as a signer.
              </span>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 text-2xl uppercase">commitment</h3>
              <span className="block text-sm text-gray-500 leading-relaxed m-0">
                PolyPay is a privacy preserving multisig wallet with payroll features.
              </span>
              <span className="block text-sm text-gray-500 leading-relaxed m-0">
                In order to improve your experience you need to generate a commitment to log-in in a &apos;private
                way&apos;
              </span>
            </>
          )}
          {commitment && (
            <div
              className="w-[296px] h-[31px] flex items-center px-2.5 py-[7px] gap-2 bg-[#FF7CEB1A] border border-main-pink rounded-full cursor-pointer hover:bg-[#FF7CEB33] transition-colors"
              onClick={() => {
                copyToClipboard(commitment || "", "Commitment copied to clipboard");
              }}
            >
              {/* Commitment text */}
              <span className="flex-1 text-pink-175 font-family-repetition text-[17px] tracking-[0.03em] truncate">
                <DecryptedText
                  text={`${commitment.slice(0, 24)}...${commitment.slice(-4)}`}
                  animateOn="view"
                  revealDirection="center"
                />
              </span>

              {/* Copy icon */}
              <Image
                src="/icons/actions/copy-purple.svg"
                alt="Copy"
                width={16}
                height={16}
                className="shrink-0"
                style={{
                  filter: "brightness(0) saturate(100%) invert(28%) sepia(100%) saturate(5000%) hue-rotate(300deg)",
                }}
              />
            </div>
          )}
        </div>

        <div className="p-4">
          {commitment ? (
            <Button
              className="w-full bg-grey-1000 hover:bg-grey-1000/80 text-white rounded-lg py-3 cursor-pointer transition-all duration-200"
              onClick={handleClose}
            >
              Continue using app
            </Button>
          ) : (
            <Button
              onClick={handleGenerateAndLogin}
              disabled={isLoading}
              className="w-full bg-pink-350 text-black rounded-lg py-3 cursor-pointer"
            >
              {isLoading ? "Generating & Signing in..." : "Generate & Sign in"}
            </Button>
          )}
        </div>
      </div>
    </ModalContainer>
  );
};

export default GenerateCommitmentModal;
