"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import ModalContainer from "./ModalContainer";
import { X } from "lucide-react";
import { useWalletClient } from "wagmi";
import DecryptedText from "~~/components/effects/DecryptedText";
import { useCreateAccount } from "~~/hooks/api";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { ModalProps } from "~~/types/modal";
import { createCommitment, createSecret } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

const GenerateCommitmentModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { setCurrentWallet, clearCurrentWallet } = useWalletStore();
  const { data: walletClient } = useWalletClient();
  const { setIdentity } = useIdentityStore();
  const { mutateAsync: createAccount } = useCreateAccount();
  const [identity, setLocalIdentity] = useState<{ secret: string; commitment: string } | null>(null);

  const handleClose = async () => {
    if (identity?.secret && identity?.commitment) {
      setIdentity(identity.secret, identity.commitment);

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/accounts/${identity.commitment}/wallets`);
        const wallets = await response.json();

        const shouldRedirect = pathname === "/" || pathname.startsWith("/dashboard");

        if (!shouldRedirect) {
          onClose();
          return;
        }

        if (wallets && wallets.length > 0) {
          setCurrentWallet(wallets[0]);
          router.push("/dashboard");
        } else {
          clearCurrentWallet();
          router.push("/dashboard/new-wallet");
        }
      } catch (err) {
        console.error("Failed to check wallets:", err);
        if (pathname === "/" || pathname.startsWith("/dashboard")) {
          router.push("/dashboard/new-wallet");
        }
      }
    }
    onClose();
  };

  const handleGenerateCommitment = async () => {
    if (!walletClient) return;

    const secret = await createSecret(walletClient);
    const cm = await createCommitment(secret);
    setLocalIdentity({ secret: secret.toString(), commitment: cm.toString() });

    try {
      await createAccount({ commitment: cm.toString() });
    } catch (err: any) {
      if (!err.message?.includes("already exists")) {
        console.error("Failed to create account:", err);
      }
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

        <div className="p-4">
          {identity?.commitment ? (
            <Button
              className="w-full bg-[#1E1E1E] hover:bg-[#1E1E1E]/80 text-white rounded-lg py-3 cursor-pointer transition-all duration-200"
              onClick={handleClose}
            >
              Continue using app
            </Button>
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
    </ModalContainer>
  );
};

export default GenerateCommitmentModal;
