"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import ModalContainer from "./ModalContainer";
import { X } from "lucide-react";
import DecryptedText from "~~/components/effects/DecryptedText";
import { useAuth } from "~~/hooks";
import { ModalProps } from "~~/types/modal";
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
    <ModalContainer isOpen={isOpen} onClose={handleClose} className="sm:max-w-[500px] p-0" isCloseButton={false}>
      <div className="flex flex-col bg-white rounded-lg overflow-hidden -mx-1.5 -my-4">
        <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
          <div className="flex items-center gap-2">
            <Image src={"/commitment/commitment-header-icon.svg"} width={36} height={36} alt="icon" />
            <span className="flex flex-col">
              <span className="font-semibold text-gray-900 uppercase">New released</span>
              <span className="text-gray-950 text-[14px]">Make your experience private through Commitment</span>
            </span>
          </div>
          <Button
            size="sm"
            className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center p-8 text-center space-y-3 bg-gray-100">
          <div className="h-[200px] w-full max-w-[200px] flex items-center justify-center relative">
            <div className="relative w-full h-full"></div>
            <div className="absolute w-50 h-50 rounded-full border-[1px] border-gray-300">
              <Image src="/commitment/key.svg" alt="Development in progress" fill className="object-contain" />
            </div>
          </div>

          <div className="">
            <h3 className="font-semibold text-gray-900 text-2xl uppercase">commitment</h3>
            <span className="text-sm text-gray-500 leading-relaxed">
              We now using commitment to protect your privacy. Your commitment can be used as a multisig signer address.
            </span>
          </div>
          {commitment && (
            <span
              className="p-2 bg-[#FF7CEB1A] border-[1px] border-primary rounded-2xl text-[#FF0ADA] font-repetition text-[17px] cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(commitment);
                notification.success("Commitment copied to clipboard");
              }}
            >
              <DecryptedText
                text={`${commitment.slice(0, 15)}...${commitment.slice(-4)}`}
                animateOn="view"
                revealDirection="center"
              />
            </span>
          )}
        </div>

        <div className="p-4">
          {commitment ? (
            <Button
              className="w-full bg-[#1E1E1E] hover:bg-[#1E1E1E]/80 text-white rounded-lg py-3 cursor-pointer transition-all duration-200"
              onClick={handleClose}
            >
              Continue using app
            </Button>
          ) : (
            <Button
              onClick={handleGenerateAndLogin}
              disabled={isLoading}
              className="w-full bg-[#FF7CEB] text-white rounded-lg py-3 cursor-pointer"
            >
              {isLoading ? "Generating & Logging in..." : "Generate & Login"}
            </Button>
          )}
        </div>
      </div>
    </ModalContainer>
  );
};

export default GenerateCommitmentModal;
