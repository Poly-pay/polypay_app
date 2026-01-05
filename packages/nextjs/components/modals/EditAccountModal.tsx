"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ModalContainer from "../modals/ModalContainer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TxType, encodeAddSigner, encodeRemoveSigner, encodeUpdateThreshold, horizenTestnet } from "@polypay/shared";
import { Copy, Repeat, Trash2, X } from "lucide-react";
import {
  useGenerateProof,
  useMetaMultiSigWallet,
  useModalApp,
  useUpdateWallet,
  useWallet,
  useWalletCommitments,
  useWalletThreshold,
} from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useZodForm } from "~~/hooks/form";
import {
  AddSignerFormData,
  EditAccountNameFormData,
  UpdateThresholdFormData,
  addSignerSchema,
  editAccountNameSchema,
  updateThresholdSchema,
} from "~~/lib/form";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth";

const EditAccountModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");
  const { openModal } = useModalApp();
  const { commitment } = useIdentityStore();
  const { mutateAsync: updateWallet, isPending: isUpdatingWallet } = useUpdateWallet();
  const { currentWallet, setCurrentWallet } = useWalletStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { data: wallet } = useWallet(metaMultiSigWallet?.address || "");

  const { data: thresholdData, refetch: refetchThreshold } = useWalletThreshold();
  const { data: commitmentsData, refetch: refetchCommitments } = useWalletCommitments();

  const threshold = Number(thresholdData ?? 0);
  const signers = commitmentsData ? commitmentsData.map((c: bigint) => c.toString()) : [];
  const accountName = currentWallet?.name ?? "Default";

  // Form for account name
  const nameForm = useZodForm({
    schema: editAccountNameSchema,
    defaultValues: { name: "" },
  });

  // Form for add signer
  const addSignerForm = useZodForm({
    schema: addSignerSchema,
    defaultValues: { signerCommitment: "", threshold: 1 },
  });

  // Form for threshold
  const thresholdForm = useZodForm({
    schema: updateThresholdSchema,
    defaultValues: { threshold: 1 },
  });
  const signerMap = useMemo(() => {
    if (!wallet?.signers) return {};
    return wallet.signers.reduce(
      (acc: any, signer: any) => {
        acc[signer.commitment] = signer.name || null;
        return acc;
      },
      {} as Record<string, string | null>,
    );
  }, [wallet?.signers]);

  const handleGenerateName = () => {
    const randomName = `Wallet-${Math.random().toString(36).substring(2, 8)}`;
    nameForm.setValue("name", randomName);
  };

  const handleUpdateName = async (data: EditAccountNameFormData) => {
    if (!commitment) return;

    if (data.name === accountName) {
      notification.warning("No changes to save");
      return;
    }

    try {
      const newWallet = await updateWallet({
        address: currentWallet?.address || "",
        dto: { name: data.name.trim() },
      });
      setCurrentWallet(newWallet);
      notification.success("Account name updated!");
      onClose();
    } catch (error: any) {
      console.error("Failed to update account name:", error);
      notification.error(error.message || "Failed to update account name");
    }
  };

  const handleAddSigner = async (data: AddSignerFormData) => {
    if (!metaMultiSigWallet) return;

    if (data.threshold < 1 || data.threshold > signers.length + 1) {
      notification.error("Invalid threshold value");
      return;
    }

    setLoading(true);
    try {
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const callData = encodeAddSigner(data.signerCommitment, data.threshold);
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: nonce,
        type: TxType.ADD_SIGNER,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        signerCommitment: data.signerCommitment.trim(),
        newThreshold: data.threshold,
        proof,
        publicInputs,
        nullifier,
      });

      await refetchCommitments();
      await refetchThreshold();

      notification.success("Add signer transaction created!");
      addSignerForm.reset({ signerCommitment: "", threshold: data.threshold });
      onClose();
    } catch (error: any) {
      console.error("Failed to add signer:", error);
      notification.error(error.message || "Failed to add signer");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleRemoveSigner = async (signerCommitment: string) => {
    if (!metaMultiSigWallet) return;

    if (signers.length <= 1) {
      notification.error("Cannot remove last signer");
      return;
    }

    let newThreshold = thresholdForm.getValues("threshold");
    if (newThreshold > signers.length - 1) {
      newThreshold = signers.length - 1;
    }

    if (newThreshold < 1 || newThreshold > signers.length - 1) {
      notification.error("Invalid threshold value for removal");
      return;
    }

    setLoading(true);
    try {
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const callData = encodeRemoveSigner(signerCommitment, newThreshold);
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: nonce,
        type: TxType.REMOVE_SIGNER,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        signerCommitment: signerCommitment,
        newThreshold: newThreshold,
        proof,
        publicInputs,
        nullifier,
      });

      await refetchCommitments();
      await refetchThreshold();

      notification.success("Remove signer transaction created!");
      onClose();
    } catch (error: any) {
      console.error("Failed to remove signer:", error);
      notification.error(error.message || "Failed to remove signer");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleUpdateThreshold = async (data: UpdateThresholdFormData) => {
    if (!metaMultiSigWallet) return;

    if (data.threshold < 1 || data.threshold > signers.length) {
      notification.error("Invalid threshold value");
      return;
    }

    if (data.threshold === threshold) {
      notification.warning("No changes to save");
      return;
    }

    setLoading(true);
    try {
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const callData = encodeUpdateThreshold(data.threshold);
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: nonce,
        type: TxType.SET_THRESHOLD,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        newThreshold: data.threshold,
        proof,
        publicInputs,
        nullifier,
      });

      await refetchThreshold();

      notification.success("Update threshold transaction created!");
      onClose();
    } catch (error: any) {
      console.error("Failed to update threshold:", error);
      notification.error(error.message || "Failed to update threshold");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.success("Copied to clipboard");
  };

  useEffect(() => {
    if (isOpen) {
      refetchThreshold();
      refetchCommitments();
    }
  }, [isOpen, refetchThreshold, refetchCommitments]);

  useEffect(() => {
    if (isOpen) {
      nameForm.reset({ name: accountName || "" });
      thresholdForm.reset({ threshold: threshold });
      addSignerForm.reset({ signerCommitment: "", threshold: threshold });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, threshold, accountName]);

  const watchedName = nameForm.watch("name");
  const watchedThreshold = thresholdForm.watch("threshold");
  const watchedSignerCommitment = addSignerForm.watch("signerCommitment");

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} className="sm:max-w-[600px] p-0" isCloseButton={false}>
      <div className="flex flex-col h-full bg-white rounded-lg">
        <div className="flex flex-row items-center justify-between p-3 m-1 border-b bg-[#EDEDED] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-200 flex items-center justify-center">
              <Image src="/common/edit-wallet.svg" alt="Edit wallet" width={40} height={40} />
            </div>
            <span className="flex flex-col">
              <span className="text-lg font-semibold text-black">EDIT YOUR WALLET</span>
              <span
                className="text-sm cursor-pointer"
                onClick={() => copyToClipboard(metaMultiSigWallet?.address ?? "")}
              >
                <span className="text-black">{horizenTestnet.name} </span>
                <span className="text-primary">
                  [{metaMultiSigWallet?.address?.slice(0, 6)}...
                  {metaMultiSigWallet?.address?.slice(-4)}]
                </span>
              </span>
            </span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 bg-white hover:bg-white/50 text-black cursor-pointer"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading && loadingState && (
          <div className="px-6 py-2 bg-blue-50 text-blue-700 text-sm text-center">{loadingState}</div>
        )}

        <div className="p-6 pt-3 space-y-6">
          {/* Account Name Form */}
          <form onSubmit={nameForm.handleSubmit(handleUpdateName)} className="mb-6">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">ACCOUNT NAME</h3>
              <p className="text-sm text-gray-500 my-0">Give your account a name to easily identify it.</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  {...nameForm.register("name")}
                  type="text"
                  maxLength={30}
                  placeholder="Your account name"
                  className="w-full pr-16"
                  disabled={loading || isUpdatingWallet}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {watchedName.length}/30
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleGenerateName}
                className="h-10 w-10 p-0 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                disabled={loading || isUpdatingWallet}
              >
                <Repeat className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
            {nameForm.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">{nameForm.formState.errors.name.message}</p>
            )}

            <Button
              type="submit"
              className="w-full mt-3 bg-[#6D2EFF] hover:bg-[#5a25d9] cursor-pointer text-white"
              disabled={loading || isUpdatingWallet || watchedName === accountName || !watchedName.trim()}
            >
              {isUpdatingWallet ? "Updating..." : "Update Name"}
            </Button>
          </form>

          {/* Signers Section */}
          <div>
            <h3 className="font-semibold text-gray-900">WALLET SIGNERS</h3>
            <p className="text-sm text-gray-500 mb-4">
              Commitments added to the signers list below will be able to approve transactions. Each signer is
              identified by their commitment (hash of secret).
            </p>

            <div className="space-y-3 mb-4">
              {signers.map((signer: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <span className="text-sm font-medium text-gray-900">
                      {signerMap[signer] || `Signer ${index + 1}`}
                    </span>
                    <span className="font-mono text-xs text-gray-500 truncate">{signer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(signer)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                      disabled={loading}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        openModal("confirm", {
                          title: "Remove Signer",
                          description: "Are you sure you want to remove this signer?",
                          confirmText: "Remove",
                          variant: "destructive",
                          onConfirm: () => handleRemoveSigner(signer),
                        })
                      }
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                      disabled={loading || signers.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Signer Form */}
            <form
              onSubmit={addSignerForm.handleSubmit(handleAddSigner)}
              className="space-y-3 p-3 border border-dashed border-gray-300 rounded-lg"
            >
              <Input
                {...addSignerForm.register("signerCommitment")}
                placeholder="Enter new signer commitment"
                className="font-mono text-sm"
                disabled={loading}
              />
              {addSignerForm.formState.errors.signerCommitment && (
                <p className="text-sm text-red-500">{addSignerForm.formState.errors.signerCommitment.message}</p>
              )}
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full cursor-pointer bg-[#6D2EFF] text-white hover:bg-[#5a25d9]"
                disabled={loading || !watchedSignerCommitment.trim()}
              >
                {loading ? "Processing..." : "Add New Signer"}
              </Button>
            </form>
          </div>

          {/* Threshold Form */}
          <form onSubmit={thresholdForm.handleSubmit(handleUpdateThreshold)}>
            <h3 className="font-semibold text-gray-900 mb-2">THRESHOLD</h3>
            <p className="text-sm text-gray-500 mb-4">Minimum number of approvals required to execute a transaction.</p>

            <div className="flex flex-col items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-full">
                <Input
                  type="number"
                  min="1"
                  max={signers.length}
                  {...thresholdForm.register("threshold", { valueAsNumber: true })}
                  className="flex-1 text-center"
                  disabled={loading}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">/ out of {signers.length} signers</span>
              </div>
              {thresholdForm.formState.errors.threshold && (
                <p className="text-sm text-red-500 w-full">{thresholdForm.formState.errors.threshold.message}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#FF7CEB] hover:bg-[#e66dd4] cursor-pointer text-white"
                disabled={loading || watchedThreshold === threshold}
              >
                {loading ? "Processing..." : "Update Threshold"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalContainer>
  );
};

export default EditAccountModal;
