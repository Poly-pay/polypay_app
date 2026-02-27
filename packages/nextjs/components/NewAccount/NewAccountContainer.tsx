"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import AccountName from "./AccountName";
import ChooseNetwork from "./ChooseNetwork";
import SignersConfirmations from "./SignersConfirmations";
import StatusContainer from "./StatusContainer";
import SuccessScreen from "./SuccessScreen";
import { Account } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useCreateAccount, useCreateAccountBatch } from "~~/hooks/api";
import { useZodForm } from "~~/hooks/form";
import { CreateAccountFormData, createAccountSchema } from "~~/lib/form";
import { useAccountStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { getDefaultChainId } from "~~/utils/network";
import { notification } from "~~/utils/scaffold-eth";
import { getValidSigners } from "~~/utils/signer";

export default function NewAccountContainer() {
  const { commitment } = useIdentityStore();
  const { setCurrentAccount } = useAccountStore();
  const { data: walletClient } = useWalletClient();

  const { mutateAsync: createAccount, isPending: isCreatingSingle } = useCreateAccount();
  const { mutateAsync: createAccountBatch, isPending: isCreatingBatch } = useCreateAccountBatch();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChainIds, setSelectedChainIds] = useState<number[]>([getDefaultChainId()]);
  const [createdAccounts, setCreatedAccounts] = useState<Account[] | null>(null);

  const form = useZodForm({
    schema: createAccountSchema,
    defaultValues: {
      name: "",
      signers: [
        { name: "", commitment: commitment || "" },
        { name: "", commitment: "" },
      ],
      threshold: 2,
    },
  });

  const { watch } = form;
  const formData = watch() as CreateAccountFormData;

  const handleNextStep = () => {
    if (!commitment) {
      notification.error("You need to have an identity commitment to create an account.");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleGoBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
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

      let accounts: Account[] = [];

      if (selectedChainIds.length === 1) {
        const account = await createAccount({
          name: formData.name,
          signers: validSigners,
          threshold: formData.threshold,
          chainId: selectedChainIds[0],
          userAddress: walletClient?.account?.address,
        });
        accounts = [account];
      } else {
        accounts = await createAccountBatch({
          name: formData.name,
          signers: validSigners,
          threshold: formData.threshold,
          chainIds: selectedChainIds,
          userAddress: walletClient?.account?.address,
        });
      }

      if (accounts.length > 0) {
        setCreatedAccounts(accounts);
        setCurrentAccount(accounts[0]);
      }

      setCurrentStep(4);
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
        signers: [
          { name: "", commitment },
          { name: "", commitment: "" },
        ],
        threshold: 2,
      });
      // Reset to step 1 when account changes
      setCurrentStep(1);
      setSelectedChainIds([getDefaultChainId()]);
      setCreatedAccounts(null);
    }
  }, [commitment, form]);

  // Validation
  const validSigners = getValidSigners(formData.signers);
  const isStep1Valid = formData.name.trim().length > 0;
  const isStep2Valid = validSigners.length >= 2 && formData.threshold >= 2 && formData.threshold <= validSigners.length;
  const isCreating = isCreatingSingle || isCreatingBatch;

  const EarthBackground = (
    <div className="w-full relative z-1">
      <div className="absolute -top-50 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <Image src="/new-account/earth.svg" alt="Globe" className="w-full h-full" width={780} height={736} />
      </div>
      <div className="absolute top-10 left-0 right-0 h-[400px] w-full bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
    </div>
  );

  if (currentStep === 4) {
    return (
      <div className="flex flex-row gap-1 w-full h-full bg-app-background">
        <div className="flex-1 overflow-hidden relative flex flex-col rounded-lg bg-background border border-divider">
          {EarthBackground}
          <SuccessScreen className="w-full" createdAccounts={createdAccounts ?? undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-1 w-full h-full bg-grey-100">
      {/* Shared Earth background */}
      <div className="flex-1 overflow-hidden relative flex flex-col rounded-lg bg-background border border-divider">
        {/* Only show Earth background on steps 1 & 3 */}
        {currentStep !== 2 && EarthBackground}

        <div className={currentStep === 2 ? "flex-1 bg-white rounded-lg relative z-10" : "flex-1 relative z-10"}>
          {currentStep === 1 && (
            <AccountName className="flex-1" form={form} onNextStep={handleNextStep} isValid={isStep1Valid} />
          )}
          {currentStep === 2 && (
            <ChooseNetwork
              className="flex-1"
              selectedChainIds={selectedChainIds}
              onToggleChain={chainId =>
                setSelectedChainIds(prev =>
                  prev.includes(chainId) ? prev.filter(id => id !== chainId) : [...prev, chainId],
                )
              }
              onGoBack={handleGoBack}
              onNextStep={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 3 && <SignersConfirmations className="flex-1" form={form} onGoBack={handleGoBack} />}
        </div>
      </div>

      <StatusContainer
        className="w-[280px] lg:w-[400px] flex-shrink-0"
        accountName={formData.name}
        currentStep={currentStep}
        signers={validSigners}
        threshold={formData.threshold}
        selectedChainIds={selectedChainIds}
        onCreateAccount={handleCreateAccount}
        loading={isCreating}
        isFormValid={isStep2Valid}
      />
    </div>
  );
}
