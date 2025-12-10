"use client";

import React, { useState } from "react";
import SignersConfirmations from "./SignersConfirmations";
import StatusContainer from "./StatusContainer";
import SuccessScreen from "./SuccessScreen";
import WalletName from "./WalletName";

export interface WalletFormData {
  name: string;
  signers: string[]; // Array of commitments
  threshold: number;
}

export default function NewWalletContainer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdWalletAddress, setCreatedWalletAddress] = useState<string>("");

  const [formData, setFormData] = useState<WalletFormData>({
    name: "",
    signers: [""], // Start with one empty signer
    threshold: 1,
  });

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleGoBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleUpdateName = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
  };

  const handleUpdateSigners = (signers: string[]) => {
    setFormData(prev => ({ ...prev, signers }));
  };

  const handleUpdateThreshold = (threshold: number) => {
    setFormData(prev => ({ ...prev, threshold }));
  };

  const handleCreateWallet = async () => {
    try {
      setLoading(true);

      // Filter out empty signers
      const validSigners = formData.signers.filter(s => s.trim() !== "");

      // TODO: Call smart contract to create wallet
      console.log("Creating wallet with:", {
        name: formData.name,
        signers: validSigners,
        threshold: formData.threshold,
      });

      // Simulate wallet creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Set created wallet address (replace with actual address from contract)
      setCreatedWalletAddress("0xF1E2D3C4B5A6978800112233445566778899AABB");

      setCurrentStep(3);
    } catch (err: any) {
      console.error("Failed to create wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validSigners = formData.signers.filter(s => s.trim() !== "");
  const isStep1Valid = formData.name.trim().length > 0;
  const isStep2Valid = validSigners.length > 0 && formData.threshold >= 1 && formData.threshold <= validSigners.length;

  const EarthBackground = (
    <div className="w-full relative z-0">
      <div className="absolute -top-50 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <img src="/new-wallet/earth.svg" alt="Globe" className="w-full h-full" />
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
          <WalletName
            className="flex-1"
            name={formData.name}
            onUpdateName={handleUpdateName}
            onNextStep={handleNextStep}
            isValid={isStep1Valid}
          />
        ) : (
          <SignersConfirmations
            className="flex-1"
            signers={formData.signers}
            threshold={formData.threshold}
            onUpdateSigners={handleUpdateSigners}
            onUpdateThreshold={handleUpdateThreshold}
            onGoBack={handleGoBack}
          />
        )}
      </div>

      <StatusContainer
        className="w-[400px]"
        walletName={formData.name}
        currentStep={currentStep}
        signers={validSigners}
        threshold={formData.threshold}
        onCreateWallet={handleCreateWallet}
        loading={loading}
        isFormValid={currentStep === 1 ? isStep1Valid : isStep2Valid}
      />
    </div>
  );
}
