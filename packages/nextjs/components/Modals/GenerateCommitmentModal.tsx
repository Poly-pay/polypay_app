"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { X } from "lucide-react";
import DecryptedText from "~~/components/effects/DecryptedText";
import { useAuth } from "~~/hooks";
import { notification } from "~~/utils/scaffold-eth";

interface GenerateCommitmentModalProps {
  children: React.ReactNode;
}

export const GenerateCommitmentModal: React.FC<GenerateCommitmentModalProps> = ({ children }) => {
  const { login, isLoading, error, commitment } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Generate ZK proof and login to get JWT tokens
  const handleGenerateAndLogin = async () => {
    const success = await login();
    if (!success) {
      notification.error("Login failed. Please try again.");
      console.error("Login failed:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
            <div className="flex items-center gap-2">
              <Image src={"/commitment/commitment-header-icon.svg"} width={36} height={36} alt="icon" />
              <span className="flex flex-col">
                <span className="font-semibold text-gray-900 uppercase">New released</span>
                <span className="text-gray-950 text-[14px]">Make your experience private through Commitment</span>
              </span>
            </div>
            <DialogClose asChild>
              <Button size="sm" className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          {/* Body */}
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
                We now using commitment to protect your privacy. Your commitment can be used as a multisig signer
                address.
              </span>
            </div>

            {/* Display commitment after successful login */}
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

          {/* Footer */}
          <div className="p-4">
            {commitment ? (
              <DialogClose asChild>
                <Button className="w-full bg-[#1E1E1E] hover:bg-[#1E1E1E]/80 text-white rounded-lg py-3 cursor-pointer transition-all duration-200">
                  Continue using app
                </Button>
              </DialogClose>
            ) : (
              <Button
                className="w-full bg-[#FF7CEB] text-white rounded-lg py-3 cursor-pointer"
                onClick={handleGenerateAndLogin}
                disabled={isLoading}
              >
                {isLoading ? "Generating & Logging in..." : "Generate & Login"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
