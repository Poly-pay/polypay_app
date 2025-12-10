"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { X } from "lucide-react";
import { useWalletClient } from "wagmi";
import DecryptedText from "~~/components/effects/DecryptedText";
import { createCommitment, createSecret } from "~~/utils/multisig";

interface GenerateCommitmentModalProps {
  children: React.ReactNode;
}

export const GenerateCommitmentModal: React.FC<GenerateCommitmentModalProps> = ({ children }) => {
  const { data: walletClient } = useWalletClient();

  const [commitment, setCommitment] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("commitment") : null;

    setCommitment(stored);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
            <div className="flex items-center gap-2">
              <img src={"/commitment/commitment-header-icon.svg"} width={36} height={36} />
              <span className="flex flex-col">
                <span className="font-semibold text-gray-900 uppercase">New released</span>
                <span className="text-gray-950 text-[14px]">Private your transaction by Commitment</span>
              </span>
            </div>
            <DialogClose asChild>
              <Button size="sm" className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center p-8 text-center space-y-3 bg-gray-100">
            {/* Illustration */}
            <div className="h-[200px] w-full max-w-[200px] flex items-center justify-center relative">
              <div className="relative w-full h-full">
              </div>
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
            {commitment && (
              <span className="p-2 bg-[#FF7CEB1A] border-[1px] border-primary rounded-2xl text-[#FF0ADA] font-repetition text-[17px]">
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
                onClick={async () => {
                  if (!walletClient) return;

                  const secret = await createSecret(walletClient);
                  const cm = await createCommitment(secret);
                  localStorage.setItem("secret", secret.toString());
                  localStorage.setItem("commitment", cm.toString());
                  setCommitment(cm.toString());
                }}
              >
                Generate Commitment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
