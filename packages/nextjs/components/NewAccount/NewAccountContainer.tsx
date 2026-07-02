"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import AccountName from "./AccountName";
import ChooseNetwork from "./ChooseNetwork";
import SignersConfirmations from "./SignersConfirmations";
import StatusContainer from "./StatusContainer";
import SuccessScreen from "./SuccessScreen";
import { ARC_TESTNET_CHAIN_ID, Account } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { arcAccountToAccount } from "~~/components/Sidebar/ArcAccountItem";
import { useCreateAccount, useCreateAccountBatch } from "~~/hooks/api";
import { useArcAuth } from "~~/hooks/app/arc/useArcAuth";
import { useArcCreateAccount } from "~~/hooks/app/arc/useArcCreateAccount";
import { useZodForm } from "~~/hooks/form";
import { CreateAccountFormData, createAccountSchema } from "~~/lib/form";
import { useAccountStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { notifyError } from "~~/utils/errorHandler";
import { getDefaultChainId } from "~~/utils/network";
import { notification } from "~~/utils/scaffold-eth";
import { getValidArcSigners, getValidSigners } from "~~/utils/signer";

export default function NewAccountContainer() {
  const { commitment } = useIdentityStore();
  const { setCurrentAccount } = useAccountStore();
  const { data: walletClient } = useWalletClient();

  const { mutateAsync: createAccount, isPending: isCreatingSingle } = useCreateAccount();
  const { mutateAsync: createAccountBatch, isPending: isCreatingBatch } = useCreateAccountBatch();

  // Arc (non-private, ECDSA) path: same wizard UI, but signers are addresses.
  const { login: arcLogin } = useArcAuth();
  const { createAccount: createArcAccount, isPending: isCreatingArc } = useArcCreateAccount();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChainIds, setSelectedChainIds] = useState<number[]>([]);
  const [createdAccounts, setCreatedAccounts] = useState<Account[] | null>(null);

  const walletAddress = walletClient?.account?.address;
  const isArc = selectedChainIds.length === 1 && selectedChainIds[0] === ARC_TESTNET_CHAIN_ID;

  const form = useZodForm({
    schema: createAccountSchema,
    defaultValues: {
      name: "",
      signers: [{ name: "", commitment: commitment || "" }],
      threshold: 1,
    },
  });

  const { watch } = form;
  const formData = watch() as CreateAccountFormData;

  const handleNextStep = () => {
    if (!commitment) {
      notification.error("You need to have a membership ID to create an account.");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleGoBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleCreateAccount = async () => {
    // Arc path: address signers, ECDSA, no ZK commitment. Requires a one-time Arc wallet sign-in.
    if (isArc) {
      try {
        // Always refresh the Arc session so create never uses a stale/expired token
        // (the persisted isAuthenticated flag can outlive the JWT / a backend restart).
        const ok = await arcLogin();
        if (!ok) return;
        const owners = getValidArcSigners(formData.signers).map(s => s.commitment);
        const arcAccount = await createArcAccount(owners, formData.threshold, ARC_TESTNET_CHAIN_ID, formData.name);
        // Same success flow as ZK: show the success screen, then the dashboard.
        const asAccount = arcAccountToAccount({ ...arcAccount, name: formData.name });
        setCreatedAccounts([asAccount]);
        setCurrentAccount(asAccount);
        setCurrentStep(4);
      } catch (err: any) {
        notifyError(err, "Failed to create Arc account");
      }
      return;
    }

    if (!commitment) {
      notification.error("You need to have a membership ID to create an account.");
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
        notification.error("Your membership ID must be included in the signers list.");
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
      notifyError(err, "Failed to create account");
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
      setSelectedChainIds([getDefaultChainId()]);
      setCreatedAccounts(null);
    }
  }, [commitment, form]);

  // Seed the first signer with the connected wallet address (Arc) or the ZK commitment.
  // Arc reuses the `commitment` form field to carry an address.
  useEffect(() => {
    if (isArc && walletAddress) {
      form.setValue("signers.0.commitment", walletAddress);
    } else if (!isArc && commitment) {
      form.setValue("signers.0.commitment", commitment);
    }
  }, [isArc, walletAddress, commitment, form]);

  // Validation
  const validSigners = isArc ? getValidArcSigners(formData.signers) : getValidSigners(formData.signers);
  const isNameValid = formData.name.trim().length > 0;
  const isSignersValid =
    validSigners.length >= 1 && formData.threshold >= 1 && formData.threshold <= validSigners.length;
  const isCreating = isCreatingSingle || isCreatingBatch || isCreatingArc;

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
        {/* Show Earth background on steps 2 (name) & 3 (signers), not on step 1 (network) */}
        {currentStep !== 1 && EarthBackground}

        <div
          className={
            currentStep === 1
              ? "flex-1 overflow-y-auto bg-white rounded-lg relative z-10"
              : "flex-1 overflow-y-auto relative z-10"
          }
        >
          {currentStep === 1 && (
            <ChooseNetwork
              className="flex-1"
              selectedChainIds={selectedChainIds}
              hasCommitment={!!commitment}
              isWalletConnected={!!walletClient?.account}
              onToggleChain={chainId => {
                if (chainId === ARC_TESTNET_CHAIN_ID) {
                  // Arc is exclusive: selecting it clears any ZK chains.
                  setSelectedChainIds(prev => (prev.length === 1 && prev[0] === chainId ? [] : [chainId]));
                } else {
                  // Selecting a ZK chain drops Arc if it was selected.
                  setSelectedChainIds(prev => {
                    const withoutArc = prev.filter(id => id !== ARC_TESTNET_CHAIN_ID);
                    return withoutArc.includes(chainId)
                      ? withoutArc.filter(id => id !== chainId)
                      : [...withoutArc, chainId];
                  });
                }
              }}
              onNextStep={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 2 && (
            <AccountName
              className="flex-1"
              form={form}
              onNextStep={handleNextStep}
              onGoBack={handleGoBack}
              isValid={isNameValid}
            />
          )}
          {currentStep === 3 && (
            <SignersConfirmations className="flex-1" form={form} onGoBack={handleGoBack} isArc={isArc} />
          )}
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
        isFormValid={isSignersValid}
      />
    </div>
  );
}
