"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import SignersConfirmations from "./SignersConfirmations";
import StatusContainer from "./StatusContainer";
import SuccessScreen from "./SuccessScreen";
import WalletName from "./WalletName";
import { useCreateWallet } from "~~/hooks/api";
import { useZodForm } from "~~/hooks/form";
import { CreateWalletFormData, createWalletSchema } from "~~/lib/form";
import { useWalletStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { notification } from "~~/utils/scaffold-eth";

export default function NewWalletContainer() {
  const { commitment } = useIdentityStore();
  const { setCurrentWallet } = useWalletStore();

  const { mutateAsync: createWallet, isPending: isCreating } = useCreateWallet();

  const [currentStep, setCurrentStep] = useState(1);
  const [createdWalletAddress, setCreatedWalletAddress] = useState<string>("");

  const form = useZodForm({
    schema: createWalletSchema,
    defaultValues: {
      name: "",
      signers: [{ name: "", commitment: commitment || "" }],
      threshold: 1,
    },
  });

  const { watch } = form;
  const formData = watch() as CreateWalletFormData;

  const handleNextStep = () => {
    if (!commitment) {
      notification.error("You need to have an identity commitment to create a wallet.");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleGoBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateWallet = async () => {
    if (!commitment) {
      notification.error("You need to have an identity commitment to create a wallet.");
      return;
    }

    try {
      // Filter signers with valid commitment (name can be empty)
      const validSigners = formData.signers.filter(
        (s: { commitment: string; name?: string }) => s?.commitment?.trim() !== "",
      );

      // Ensure creator commitment is in the list
      const hasCreator = validSigners.some((s: { commitment: string; name?: string }) => s.commitment === commitment);
      if (!hasCreator) {
        notification.error("Your commitment must be included in the signers list.");
        return;
      }

      const wallet = await createWallet({
        name: formData.name,
        signers: validSigners,
        threshold: formData.threshold,
      });

      setCurrentWallet(wallet);
      setCreatedWalletAddress(wallet.address);
      setCurrentStep(3);
    } catch (err: any) {
      notification.error("Failed to create wallet: " + (err?.message || err.toString()));
      console.error("Failed to create wallet:", err);
    }
  };

  // Reset form when commitment changes (user switches account)
  useEffect(() => {
    if (commitment) {
      form.reset({
        name: "",
        signers: [{ name: "", commitment }],
        threshold: 1,
      });
      // Reset to step 1 when account changes
      setCurrentStep(1);
    }
  }, [commitment, form]);

  // Validation
  const validSigners = formData.signers.filter(
    (s: { commitment: string; name?: string }) => s?.commitment?.trim() !== "",
  );
  const isStep1Valid = formData.name.trim().length > 0;
  const isStep2Valid = validSigners.length > 0 && formData.threshold >= 1 && formData.threshold <= validSigners.length;

  const EarthBackground = (
    <div className="w-full relative z-0">
      <div className="absolute -top-50 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <Image src="/new-wallet/earth.svg" alt="Globe" className="w-full h-full" width={780} height={736} />
      </div>
      <div className="absolute top-10 left-0 right-0 h-[400px] w-full bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
    </div>
  );

  // if (true) {
  if (currentStep === 3) {
    return (
      <div className="flex flex-row gap-1 w-full h-full bg-app-background">
        <div className="flex-1 overflow-hidden relative flex flex-col rounded-lg bg-background border border-divider">
          {EarthBackground}
          <SuccessScreen className="w-full" walletName={formData.name} walletAddress={createdWalletAddress} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-1 w-full h-full bg-[#EDEDED]">
      {/* Shared Earth background */}
      <div className="flex-1 overflow-hidden relative flex flex-col rounded-lg bg-background border border-divider">
        {EarthBackground}
        {currentStep === 1 ? (
          <WalletName className="flex-1" form={form} onNextStep={handleNextStep} isValid={isStep1Valid} />
        ) : (
          <SignersConfirmations className="flex-1" form={form} onGoBack={handleGoBack} />
        )}
      </div>

      <StatusContainer
        className="w-[400px]"
        walletName={formData.name}
        currentStep={currentStep}
        signers={validSigners}
        threshold={formData.threshold}
        onCreateWallet={handleCreateWallet}
        loading={isCreating}
        isFormValid={currentStep === 1 ? isStep1Valid : isStep2Valid}
      />
    </div>
  );
}
