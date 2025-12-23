"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { ConfirmDialog } from "./Confirm";
import { TxType, encodeAddSigner, encodeRemoveSigner, encodeUpdateThreshold } from "@polypay/shared";
import { Copy, Repeat, Trash2, X } from "lucide-react";
import { useMetaMultiSigWallet, useUpdateWallet } from "~~/hooks";
import { useCreateTransaction } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

interface EditAccountModalProps {
  children: React.ReactNode;
  signers: string[]; // commitments
  threshold: number;
  accountName?: string;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  children,
  signers = [],
  threshold = 0,
  accountName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editThreshold, setEditThreshold] = useState(threshold);
  const [newSignerCommitment, setNewSignerCommitment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");
  const [editName, setEditName] = useState(accountName || "");
  const { commitment } = useIdentityStore();
  const { mutateAsync: updateWallet, isPending: isUpdatingWallet } = useUpdateWallet();

  const { currentWallet, setCurrentWallet } = useWalletStore();

  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });
  const { mutateAsync: createTransaction } = useCreateTransaction();

  const newThresholdForAdd = editThreshold;
  const newThresholdForRemove = editThreshold;

  const handleGenerateName = () => {
    const randomName = `Wallet-${Math.random().toString(36).substring(2, 8)}`;
    setEditName(randomName);
  };

  // ============ Update Account Name ============
  const handleUpdateName = async () => {
    if (!commitment || !editName.trim()) return;

    if (editName === accountName) {
      notification.warning("No changes to save");
      return;
    }

    try {
      const newWallet = await updateWallet({
        address: currentWallet?.address || "",
        dto: { name: editName.trim() },
      });
      setCurrentWallet(newWallet);
      notification.success("Account name updated!");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to update account name:", error);
      notification.error(error.message || "Failed to update account name");
    }
  };

  // ============ Add Signer ============
  const handleAddSigner = async () => {
    if (!metaMultiSigWallet || !newSignerCommitment.trim()) return;

    // Validate
    if (newThresholdForAdd < 1 || newThresholdForAdd > signers.length + 1) {
      notification.error("Invalid threshold value");
      return;
    }

    setLoading(true);
    try {
      // 1. Get current nonce and calculate txHash
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // Build callData for addSigner
      const callData = encodeAddSigner(newSignerCommitment, newThresholdForAdd);

      // 2. Get txHash from contract
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      const { proof, publicInputs, nullifier, commitment: myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: TxType.ADD_SIGNER,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        signerCommitment: newSignerCommitment.trim(),
        newThreshold: newThresholdForAdd,
        creatorCommitment: myCommitment,
        proof,
        publicInputs,
        nullifier,
      });

      notification.success("Add signer transaction created!");
      setNewSignerCommitment("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to add signer:", error);
      notification.error(error.message || "Failed to add signer");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  // ============ Remove Signer ============
  const handleRemoveSigner = async (signerCommitment: string) => {
    if (!metaMultiSigWallet) return;

    if (signers.length <= 1) {
      notification.error("Cannot remove last signer");
      return;
    }

    let newThreshold = newThresholdForRemove;
    if (newThreshold > signers.length - 1) {
      newThreshold = signers.length - 1;
    }

    // Validate threshold
    if (newThreshold < 1 || newThreshold > signers.length - 1) {
      notification.error("Invalid threshold value for removal");
      return;
    }

    setLoading(true);
    try {
      // 1. Get current nonce
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // Build callData for removeSigner
      const callData = encodeRemoveSigner(signerCommitment, newThreshold);

      // 2. Get txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      const { proof, publicInputs, nullifier, commitment: myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: TxType.REMOVE_SIGNER,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        signerCommitment: signerCommitment,
        newThreshold: newThreshold,
        creatorCommitment: myCommitment,
        proof,
        publicInputs,
        nullifier,
      });

      notification.success("Remove signer transaction created!");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to remove signer:", error);
      notification.error(error.message || "Failed to remove signer");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  // ============ Update Threshold ============
  const handleUpdateThreshold = async () => {
    if (!metaMultiSigWallet) return;

    if (editThreshold < 1 || editThreshold > signers.length) {
      notification.error("Invalid threshold value");
      return;
    }

    if (editThreshold === threshold) {
      notification.warning("No changes to save");
      return;
    }

    setLoading(true);
    try {
      // 1. Get current nonce
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // Build callData for updateSignaturesRequired
      const callData = encodeUpdateThreshold(editThreshold);

      // 2. Get txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      const { proof, publicInputs, nullifier, commitment: myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: TxType.SET_THRESHOLD,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: signers.length,
        newThreshold: editThreshold,
        creatorCommitment: myCommitment,
        proof,
        publicInputs,
        nullifier,
      });

      notification.success("Update threshold transaction created!");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to update threshold:", error);
      notification.error(error.message || "Failed to update threshold");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  // ============ Copy to Clipboard ============
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.success("Copied to clipboard");
  };

  React.useEffect(() => {
    if (isOpen) {
      setEditThreshold(threshold);
      setEditName(accountName || "");
    }
  }, [isOpen, threshold, accountName]);

  // ============ Render ============
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0 overflow-hidden" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col h-full bg-white rounded-lg">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-3 m-1 border-b bg-[#EDEDED] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-200 flex items-center justify-center">
                <Image src={"/common/edit-wallet.svg"} alt="Edit wallet" />
              </div>
              <span className="flex flex-col">
                <span className="text-lg font-semibold text-black">EDIT YOUR WALLET</span>
                <span
                  className="text-sm cursor-pointer"
                  onClick={() => copyToClipboard(metaMultiSigWallet?.address ?? "")}
                >
                  <span className="text-black">Ethereum </span>
                  <span className="text-primary">
                    [{metaMultiSigWallet?.address?.slice(0, 6)}...
                    {metaMultiSigWallet?.address?.slice(-4)}]
                  </span>
                </span>
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 bg-white hover:bg-white/50 text-black cursor-pointer"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Loading State */}
          {loading && loadingState && (
            <div className="px-6 py-2 bg-blue-50 text-blue-700 text-sm text-center">{loadingState}</div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-6">
            {/* Account Name Section */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900">ACCOUNT NAME</h3>
              <p className="text-sm text-gray-500 mb-4">Give your account a name to easily identify it.</p>

              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={editName}
                    onChange={e => {
                      if (e.target.value.length <= 30) {
                        setEditName(e.target.value);
                      }
                    }}
                    maxLength={30}
                    placeholder="Your account name"
                    className="w-full pr-16"
                    disabled={loading || isUpdatingWallet}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {editName.length}/30
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={handleGenerateName}
                  className="h-10 w-10 p-0 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                  disabled={loading || isUpdatingWallet}
                >
                  <Repeat className="h-4 w-4 text-gray-600" />
                </Button>
              </div>

              <Button
                onClick={handleUpdateName}
                className="w-full mt-3 bg-[#6D2EFF] hover:bg-[#5a25d9] cursor-pointer text-white"
                disabled={loading || isUpdatingWallet || editName === accountName || !editName.trim()}
              >
                {isUpdatingWallet ? "Updating..." : "Update Name"}
              </Button>
            </div>

            {/* Wallet Signers Section */}
            <div>
              <h3 className="font-semibold text-gray-900">WALLET SIGNERS</h3>
              <p className="text-sm text-gray-500 mb-4">
                Commitments added to the signers list below will be able to approve transactions. Each signer is
                identified by their commitment (hash of secret).
              </p>

              {/* Existing Signers */}
              <div className="space-y-3 mb-4">
                {signers.map((signer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-mono text-sm text-gray-900 w-[400px] truncate">{signer}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(signer)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                        disabled={loading}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      {/* Remove Signer with Threshold Input */}
                      <ConfirmDialog
                        title="Remove Signer"
                        description="Are you sure you want to remove this signer?"
                        onConfirm={() => handleRemoveSigner(signer)}
                      >
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 bg-gray-200 hover:bg-gray-300 cursor-pointer"
                          disabled={loading || signers.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Signer */}
              <div className="space-y-3 p-3 border border-dashed border-gray-300 rounded-lg">
                <Input
                  placeholder="Enter new signer commitment"
                  value={newSignerCommitment}
                  onChange={e => setNewSignerCommitment(e.target.value)}
                  className="font-mono text-sm"
                  disabled={loading}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddSigner}
                  className="w-full cursor-pointer bg-[#6D2EFF] text-white hover:bg-[#5a25d9]"
                  disabled={loading || !newSignerCommitment.trim()}
                >
                  {loading ? "Processing..." : "Add New Signer"}
                </Button>
              </div>
            </div>

            {/* Threshold Section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">THRESHOLD</h3>
              <p className="text-sm text-gray-500 mb-4">
                Minimum number of approvals required to execute a transaction.
              </p>

              <div className="flex flex-col items-center justify-between gap-2">
                <div className="flex items-center gap-2 w-full">
                  <Input
                    type="number"
                    min="1"
                    max={signers.length}
                    value={editThreshold}
                    onChange={e => setEditThreshold(Number(e.target.value))}
                    className="flex-1 text-center"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">/ out of {signers.length} signers</span>
                </div>

                <Button
                  onClick={handleUpdateThreshold}
                  className="w-full bg-[#FF7CEB] hover:bg-[#e66dd4] cursor-pointer text-white"
                  disabled={loading || editThreshold === threshold}
                >
                  {loading ? "Processing..." : "Update Threshold"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
