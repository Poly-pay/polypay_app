"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import AccountName from "./AccountName";
import SignersConfirmations from "./SignersConfirmations";
import StatusContainer from "./StatusContainer";
import SuccessScreen from "./SuccessScreen";
import { useCreateAccount } from "~~/hooks/api";
import { useZodForm } from "~~/hooks/form";
import { CreateAccountFormData, createAccountSchema } from "~~/lib/form";
import { useAccountStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { notification } from "~~/utils/scaffold-eth";

export default function NewAccountContainer() {
  const { commitment } = useIdentityStore();
  const { setCurrentAccount } = useAccountStore();

  const { mutateAsync: createAccount, isPending: isCreating } = useCreateAccount();

  const [currentStep, setCurrentStep] = useState(1);
  const [createdAccountAddress, setCreatedAccountAddress] = useState<string>("");

  const form = useZodForm({
    schema: createAccountSchema,
    defaultValues: {
      name: "",
      signers: [{ name: "", commitment: commitment || "" }],
      threshold: 1,
    },
  });

  const { watch, setValue } = form;
  const formData = watch() as CreateAccountFormData;

  const handleNextStep = () => {
    if (!commitment) {
      notification.error("You need to have an identity commitment to create an account.");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleGoBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateAccount = async () => {
    if (!commitment) {
      notification.error("You need to have an identity commitment to create an account.");
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

      const account = await createAccount({
        name: formData.name,
        signers: validSigners,
        threshold: formData.threshold,
      });

      setCurrentAccount(account);
      setCreatedAccountAddress(account.address);
      setCurrentStep(3);
    } catch (err: any) {
      notification.error("Failed to create account: " + (err?.message || err.toString()));
      console.error("Failed to create account:", err);
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
        <Image src="/new-account/earth.svg" alt="Globe" className="w-full h-full" width={780} height={736} />
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
          <SuccessScreen className="w-full" accountName={formData.name} accountAddress={createdAccountAddress} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-1 w-full h-full bg-grey-100">
      {/* Shared Earth background */}
      <div className="flex-1 overflow-hidden relative flex flex-col rounded-lg bg-background border border-divider">
        {EarthBackground}
        {currentStep === 1 ? (
          <AccountName className="flex-1" form={form} onNextStep={handleNextStep} isValid={isStep1Valid} />
        ) : (
          <SignersConfirmations className="flex-1" form={form} onGoBack={handleGoBack} />
        )}
      </div>

      <StatusContainer
        className="w-[400px]"
        accountName={formData.name}
        currentStep={currentStep}
        signers={validSigners}
        threshold={formData.threshold}
        onCreateAccount={handleCreateAccount}
        loading={isCreating}
        isFormValid={currentStep === 1 ? isStep1Valid : isStep2Valid}
      />
    </div>
  );
}
