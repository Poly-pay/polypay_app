"use client";

import React, { useEffect, useMemo, useState } from "react";
import ConfirmStep from "./ConfirmStep";
import EditStep from "./EditStep";
import SubmittingStep from "./SubmittingStep";
import { ActionMode, ExistingSigner, ModalStep, PendingSigner } from "./types";
import ModalContainer from "~~/components/modals/ModalContainer";
import { useAccount, useMetaMultiSigWallet, useSignerTransaction } from "~~/hooks";
import { useIdentityStore } from "~~/services/store";
import { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth";

const EditAccountModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { commitment: myCommitment } = useIdentityStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { data: account } = useAccount(metaMultiSigWallet?.address || "");

  const {
    addSigner,
    removeSigner,
    updateThreshold,
    isLoading: loading,
    loadingState,
    signers,
    threshold: originalThreshold,
    refetchCommitments,
    refetchThreshold,
  } = useSignerTransaction({ onSuccess: onClose });

  // Step state
  const [step, setStep] = useState<ModalStep>("edit");

  // Shared state
  const [pendingAdds, setPendingAdds] = useState<PendingSigner[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(1);
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build existing signers list
  const existingSigners: ExistingSigner[] = useMemo(() => {
    if (!account?.signers) {
      return signers.map((commitment, index) => ({
        commitment,
        name: `Signer ${index + 1}`,
        isYou: commitment === myCommitment,
      }));
    }

    return signers.map((commitment, index) => {
      const signerData = account.signers.find(s => s.commitment === commitment);
      return {
        commitment,
        name: signerData?.name || `Signer ${index + 1}`,
        isYou: commitment === myCommitment,
      };
    });
  }, [signers, account?.signers, myCommitment]);

  // Derived values
  const mode: ActionMode = useMemo(() => {
    if (pendingAdds.length > 0) return "ADD";
    if (pendingRemoves.length > 0) return "REMOVE";
    return "IDLE";
  }, [pendingAdds, pendingRemoves]);

  const totalSignersAfterChanges = existingSigners.length + pendingAdds.length - pendingRemoves.length;

  const removedSigners = existingSigners.filter(s => pendingRemoves.includes(s.commitment));

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("edit");
      setPendingAdds([]);
      setPendingRemoves([]);
      setShowWarning(false);
      setIsSubmitting(false);
      refetchThreshold();
      refetchCommitments();
    }
  }, [isOpen, refetchThreshold, refetchCommitments]);

  // Sync threshold with original when it changes
  useEffect(() => {
    if (isOpen && originalThreshold) {
      setThreshold(originalThreshold);
    }
  }, [isOpen, originalThreshold]);

  // Auto-hide warning after 5 seconds
  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => setShowWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWarning]);

  // Handlers
  const handleFullClose = () => {
    setStep("edit");
    setPendingAdds([]);
    setPendingRemoves([]);
    setThreshold(originalThreshold);
    setShowWarning(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleGoToConfirm = () => {
    setStep("confirm");
  };

  const handleBackToEdit = () => {
    setStep("edit");
  };

  const handleSubmit = async () => {
    setStep("submitting");
    setIsSubmitting(true);

    try {
      if (mode === "ADD" && pendingAdds.length > 0) {
        // Add signers
        await addSigner(
          pendingAdds.map(s => ({ commitment: s.commitment.trim(), name: s.name?.trim() || null })),
          threshold,
        );
      } else if (mode === "REMOVE" && removedSigners.length > 0) {
        await removeSigner(
          removedSigners.map(s => ({
            commitment: s.commitment,
            name: s.name?.trim() || null,
          })),
          threshold,
        );
      } else if (threshold !== originalThreshold) {
        // Update threshold only
        await updateThreshold(threshold);
      }

      notification.success("Proposal submitted successfully!");
      handleFullClose();
    } catch (error: any) {
      console.error("Failed to submit proposal:", error);
      notification.error(error.message || "Failed to submit proposal");
      setStep("confirm"); // Back to confirm on error
      setIsSubmitting(false);
    }
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={handleFullClose} className="sm:max-w-[500px] p-0" isCloseButton={false}>
      {step === "edit" && (
        <EditStep
          pendingAdds={pendingAdds}
          pendingRemoves={pendingRemoves}
          threshold={threshold}
          showWarning={showWarning}
          setPendingAdds={setPendingAdds}
          setPendingRemoves={setPendingRemoves}
          setThreshold={setThreshold}
          setShowWarning={setShowWarning}
          existingSigners={existingSigners}
          originalThreshold={originalThreshold}
          loading={loading}
          loadingState={loadingState}
          onNext={handleGoToConfirm}
          onClose={handleFullClose}
        />
      )}

      {step === "confirm" && (
        <ConfirmStep
          mode={mode}
          pendingAdds={pendingAdds}
          removedSigners={removedSigners}
          newThreshold={threshold}
          totalSignersAfterChanges={totalSignersAfterChanges}
          originalThreshold={originalThreshold}
          onBack={handleBackToEdit}
          onClose={handleFullClose}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      )}

      {step === "submitting" && <SubmittingStep />}
    </ModalContainer>
  );
};

export default EditAccountModal;
