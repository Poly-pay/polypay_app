"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { ConfirmDialog } from "./Confirm";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { Copy, Trash2, X } from "lucide-react";
import { encodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks/api";
import { useCreateTransaction } from "~~/hooks/api/useTransaction";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";
import { useIdentityStore } from "~~/services/store";

interface EditAccountModalProps {
  children: React.ReactNode;
  signers: string[]; // commitments
  threshold: number;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({ children, signers = [], threshold = 0 }) => {
  const { commitment: myCommitment, secret } = useIdentityStore();

  const [isOpen, setIsOpen] = useState(false);
  const [editThreshold, setEditThreshold] = useState(threshold);
  const [newSignerCommitment, setNewSignerCommitment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();

  const newThresholdForAdd = threshold;
  const newThresholdForRemove = threshold;

  // ============ Generate Proof Helper ============
  const generateProof = async (txHash: `0x${string}`) => {
    if (!walletClient || !metaMultiSigWallet) {
      throw new Error("Wallet not connected");
    }

    // 1. Sign txHash
    const signature = await walletClient.signMessage({
      message: { raw: txHash },
    });
    const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

    // 2. Get secret
    if (!secret) {
      throw new Error("No secret found in localStorage");
    }

    // 3. Calculate values
    const txHashBytes = hexToByteArray(txHash);
    const sigBytes = hexToByteArray(signature).slice(0, 64);
    const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
    const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

    // 4. Get merkle data
    const commitments = await metaMultiSigWallet.read.getCommitments();
    const tree = await buildMerkleTree(commitments ?? []);
    const merkleRoot = await metaMultiSigWallet.read.merkleRoot();

    if (!myCommitment) {
      throw new Error("No commitment found in localStorage");
    }

    const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(myCommitment));

    if (leafIndex === -1) {
      throw new Error("You are not a signer");
    }

    const merklePath = getMerklePath(tree, leafIndex);

    // 5. Generate ZK proof
    const input = {
      signature: sigBytes,
      pub_key_x: pubKeyX,
      pub_key_y: pubKeyY,
      secret: secret,
      leaf_index: leafIndex,
      merkle_path: merklePath.map(p => p.toString()),
      tx_hash_bytes: txHashBytes,
      tx_hash_commitment: txHashCommitment.toString(),
      merkle_root: merkleRoot?.toString() ?? "",
      nullifier: nullifier.toString(),
    };

    setLoadingState("Loading circuit...");
    const circuit_json = await fetch("/circuit/target/circuit.json");
    const noir_data = await circuit_json.json();
    const { bytecode, abi } = noir_data;

    setLoadingState("Generating proof...");
    const noir = new Noir({ bytecode, abi } as any);
    const execResult = await noir.execute(input);

    const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
    const { proof, publicInputs } = await plonk.generateProof(execResult.witness);

    return {
      proof: Array.from(proof),
      publicInputs,
      nullifier: nullifier.toString(),
      myCommitment,
    };
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
      const callData = encodeFunctionData({
        abi: [
          {
            name: "addSigner",
            type: "function",
            inputs: [
              { name: "newCommitment", type: "uint256" },
              { name: "newSigRequired", type: "uint256" },
            ],
          },
        ],
        functionName: "addSigner",
        args: [BigInt(newSignerCommitment), BigInt(newThresholdForAdd)],
      });

      // 2. Get txHash from contract
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      setLoadingState("Signing transaction...");
      const { proof, publicInputs, nullifier, myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: "ADD_SIGNER",
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
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

    // Validate threshold
    if (newThresholdForRemove < 1 || newThresholdForRemove > signers.length - 1) {
      notification.error("Invalid threshold value for removal");
      return;
    }

    setLoading(true);
    try {
      // 1. Get current nonce
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // Build callData for removeSigner
      const { encodeFunctionData } = await import("viem");
      const callData = encodeFunctionData({
        abi: [
          {
            name: "removeSigner",
            type: "function",
            inputs: [
              { name: "commitment", type: "uint256" },
              { name: "newSigRequired", type: "uint256" },
            ],
          },
        ],
        functionName: "removeSigner",
        args: [BigInt(signerCommitment), BigInt(newThresholdForRemove)],
      });

      // 2. Get txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      setLoadingState("Signing transaction...");
      const { proof, publicInputs, nullifier, myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: "REMOVE_SIGNER",
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        signerCommitment: signerCommitment,
        newThreshold: newThresholdForRemove,
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
      const { encodeFunctionData } = await import("viem");
      const callData = encodeFunctionData({
        abi: [
          {
            name: "updateSignaturesRequired",
            type: "function",
            inputs: [{ name: "newSigRequired", type: "uint256" }],
          },
        ],
        functionName: "updateSignaturesRequired",
        args: [BigInt(editThreshold)],
      });

      // 2. Get txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address,
        0n,
        callData,
      ])) as `0x${string}`;

      // 3. Generate proof
      setLoadingState("Signing transaction...");
      const { proof, publicInputs, nullifier, myCommitment } = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await createTransaction({
        nonce: Number(currentNonce),
        type: "SET_THRESHOLD",
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
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

  // ============ Render ============
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col h-full bg-white rounded-lg">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-3 m-1 border-b bg-[#EDEDED] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-200 flex items-center justify-center">
                <img src={"/common/edit-wallet.svg"} alt="Edit wallet" />
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
