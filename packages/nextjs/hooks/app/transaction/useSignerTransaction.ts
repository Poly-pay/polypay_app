import { useState } from "react";
import { SignerData, TxType, encodeAddSigners, encodeRemoveSigners, encodeUpdateThreshold } from "@polypay/shared";
import { useGenerateProof, useMetaMultiSigWallet, useWalletCommitments, useWalletThreshold } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { notification } from "~~/utils/scaffold-eth";

interface UseSignerTransactionOptions {
  onSuccess?: () => void;
}

export const useSignerTransaction = (options?: UseSignerTransactionOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { data: thresholdData, refetch: refetchThreshold } = useWalletThreshold();
  const { data: commitmentsData, refetch: refetchCommitments } = useWalletCommitments();

  const threshold = Number(thresholdData ?? 0);
  const signers = commitmentsData ? commitmentsData.map((c: bigint) => c.toString()) : [];

  /**
   * Common flow for all signer transactions
   * 1. Reserve nonce
   * 2. Get current threshold
   * 3. Get transaction hash
   * 4. Generate ZK proof
   * 5. Create transaction via API
   */
  const executeSignerTransaction = async (
    type: TxType,
    callData: `0x${string}`,
    txPayload: Record<string, unknown>,
  ) => {
    if (!metaMultiSigWallet) {
      throw new Error("Wallet not connected");
    }

    const { nonce } = await reserveNonce(metaMultiSigWallet.address);
    const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

    const txHash = (await metaMultiSigWallet.read.getTransactionHash([
      BigInt(nonce),
      metaMultiSigWallet.address,
      0n,
      callData,
    ])) as `0x${string}`;

    const { proof, publicInputs, nullifier, vk } = await generateProof(txHash);

    setLoadingState("Submitting to backend...");

    await createTransaction({
      nonce,
      type,
      accountAddress: metaMultiSigWallet.address,
      threshold: Number(currentThreshold),
      proof,
      publicInputs,
      nullifier,
      vk: vk ? Buffer.from(vk).toString("base64") : undefined,
      ...txPayload,
    });

    await refetchCommitments();
    await refetchThreshold();
  };

  const addSigner = async (newSigners: SignerData[], newThreshold: number) => {
    if (newSigners.length === 0) {
      notification.error("At least one signer is required");
      return;
    }

    if (newSigners.length > 10) {
      notification.error("Maximum 10 signers per transaction");
      return;
    }

    if (newThreshold < 1 || newThreshold > signers.length + newSigners.length) {
      notification.error("Invalid threshold value");
      return;
    }

    setIsLoading(true);
    try {
      const commitments = newSigners.map(s => s.commitment.trim());
      const callData = encodeAddSigners(commitments, newThreshold);

      await executeSignerTransaction(TxType.ADD_SIGNER, callData, {
        signers: newSigners.map(s => ({
          commitment: s.commitment.trim(),
          name: s.name?.trim() || null,
        })),
        newThreshold,
      });

      notification.success("Add signer transaction created!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Failed to add signer:", error);
      notification.error(error.message || "Failed to add signer");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const removeSigner = async (signersToRemove: SignerData[], newThreshold: number) => {
    if (signersToRemove.length === 0) {
      notification.error("At least one signer is required");
      return;
    }

    if (signersToRemove.length > 10) {
      notification.error("Maximum 10 signers per transaction");
      return;
    }

    const remainingSigners = signers.length - signersToRemove.length;

    if (remainingSigners < 1) {
      notification.error("Cannot remove all signers");
      return;
    }

    let adjustedThreshold = newThreshold;
    if (adjustedThreshold > remainingSigners) {
      adjustedThreshold = remainingSigners;
    }

    if (adjustedThreshold < 1) {
      notification.error("Invalid threshold value for removal");
      return;
    }

    setIsLoading(true);
    try {
      const commitments = signersToRemove.map(s => s.commitment.trim());
      const callData = encodeRemoveSigners(commitments, adjustedThreshold);

      await executeSignerTransaction(TxType.REMOVE_SIGNER, callData, {
        signers: signersToRemove.map(s => ({
          commitment: s.commitment.trim(),
          name: s.name?.trim() || null,
        })),
        newThreshold: adjustedThreshold,
      });

      notification.success("Remove signer transaction created!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Failed to remove signer:", error);
      notification.error(error.message || "Failed to remove signer");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const updateThreshold = async (newThreshold: number) => {
    if (newThreshold < 1 || newThreshold > signers.length) {
      notification.error("Invalid threshold value");
      return;
    }

    if (newThreshold === threshold) {
      notification.warning("No changes to save");
      return;
    }

    setIsLoading(true);
    try {
      const callData = encodeUpdateThreshold(newThreshold);
      await executeSignerTransaction(TxType.SET_THRESHOLD, callData, {
        newThreshold,
      });

      notification.success("Update threshold transaction created!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Failed to update threshold:", error);
      notification.error(error.message || "Failed to update threshold");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  return {
    addSigner,
    removeSigner,
    updateThreshold,
    isLoading,
    loadingState,
    signers,
    threshold,
    refetchCommitments,
    refetchThreshold,
  };
};
