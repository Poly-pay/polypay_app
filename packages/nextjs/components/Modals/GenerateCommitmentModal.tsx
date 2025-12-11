"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { X } from "lucide-react";
import { useWalletClient } from "wagmi";
import DecryptedText from "~~/components/effects/DecryptedText";
import { useCreateAccount } from "~~/hooks/api";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { createCommitment, createSecret } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

interface GenerateCommitmentModalProps {
  children: React.ReactNode;
}

export const GenerateCommitmentModal: React.FC<GenerateCommitmentModalProps> = ({ children }) => {
  const router = useRouter();
  const { setCurrentWallet, clearCurrentWallet } = useWalletStore();
  const { data: walletClient } = useWalletClient();
  const { setIdentity } = useIdentityStore();
  const { mutateAsync: createAccount } = useCreateAccount();
  const [identity, setLocalIdentity] = useState<{ secret: string; commitment: string } | null>(null);

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && identity?.secret && identity?.commitment) {
      setIdentity(identity.secret, identity.commitment);

      // Check wallets of account
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/accounts/${identity.commitment}/wallets`);
        const wallets = await response.json();

        // Route based on wallets
        if (wallets && wallets.length > 0) {
          setCurrentWallet(wallets[0]);
          router.push("/dashboard");
        } else {
          clearCurrentWallet();
          router.push("/dashboard/new-wallet");
        }
      } catch (err) {
        console.error("Failed to check wallets:", err);
        router.push("/create-wallet");
      }
    }
  };

  const handleGenerateCommitment = async () => {
    if (!walletClient) return;

    const secret = await createSecret(walletClient);
    const cm = await createCommitment(secret);
    setLocalIdentity({ secret: secret.toString(), commitment: cm.toString() });

    // create account on backend
    try {
      await createAccount({ commitment: cm.toString() });
    } catch (err: any) {
      // Ignore nếu account đã tồn tại (409 Conflict)
      if (!err.message?.includes("already exists")) {
        console.error("Failed to create account:", err);
      }
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
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
            {identity?.commitment && (
              <span
                className="p-2 bg-[#FF7CEB1A] border-[1px] border-primary rounded-2xl text-[#FF0ADA] font-repetition text-[17px] cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(identity.commitment || "");
                  notification.success("Commitment copied to clipboard");
                }}
              >
                <DecryptedText
                  text={`${identity.commitment.slice(0, 15)}...${identity.commitment.slice(-4)}`}
                  animateOn="view"
                  revealDirection="center"
                />
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="p-4">
            {identity?.commitment ? (
              <DialogClose asChild>
                <Button className="w-full bg-[#1E1E1E] hover:bg-[#1E1E1E]/80 text-white rounded-lg py-3 cursor-pointer transition-all duration-200">
                  Continue using app
                </Button>
              </DialogClose>
            ) : (
              <Button
                className="w-full bg-[#FF7CEB] text-white rounded-lg py-3 cursor-pointer"
                onClick={handleGenerateCommitment}
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
