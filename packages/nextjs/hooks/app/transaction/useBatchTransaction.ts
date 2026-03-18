import { useState } from "react";
import { BatchItem, TxType, ZERO_ADDRESS, encodeBatchTransfer, encodeBatchTransferMulti } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useStepLoading } from "~~/hooks/app/useStepLoading";
import { useIdentityStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

interface UseBatchTransactionOptions {
  onSuccess?: () => void;
}

const BATCH_STEPS = [
  { id: 1, label: "Preparing your batch..." },
  { id: 2, label: "Waiting for wallet approval..." },
  { id: 3, label: "Securing your transaction..." },
  { id: 4, label: "Almost done, submitting..." },
];

export const useBatchTransaction = (options?: UseBatchTransactionOptions) => {
  const { isLoading, loadingState, loadingStep, totalSteps, startStep, setStepByLabel, reset } =
    useStepLoading(BATCH_STEPS);

  const { data: walletClient } = useWalletClient();
  const { secret, commitment: myCommitment } = useIdentityStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setStepByLabel,
  });

  const proposeBatch = async (selectedBatchItems: BatchItem[]) => {
    if (selectedBatchItems.length === 0) {
      notification.error("No items selected");
      return;
    }

    // Validate wallet connection
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    if (!secret || !myCommitment) {
      notification.error("No identity found. Please create identity first.");
      return;
    }

    try {
      const selectedIds = selectedBatchItems.map(item => item.id);

      // 1. Reserve nonce from backend
      startStep(1);
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // 3. Prepare batch data
      const recipients = selectedBatchItems.map(item => item.recipient as `0x${string}`);
      const amounts: bigint[] = selectedBatchItems.map(item => BigInt(item.amount));
      const tokenAddresses = selectedBatchItems.map(item => item.tokenAddress || ZERO_ADDRESS);

      // Check if any ERC20 token in batch
      const hasERC20 = tokenAddresses.some(addr => addr !== ZERO_ADDRESS);

      // 4. Encode function call based on token types
      const batchTransferData = hasERC20
        ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
        : encodeBatchTransfer(recipients, amounts);

      // 5. Calculate txHash (to = wallet itself, value = 0, data = batchTransfer call)
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        metaMultiSigWallet.address,
        0n,
        batchTransferData,
      ])) as `0x${string}`;

      // 6. Generate ZK proof
      const { proof, publicInputs, nullifier, vk } = await generateProof(txHash);

      // 7. Submit to backend
      startStep(4);
      const result = await createTransaction({
        nonce,
        type: TxType.BATCH,
        accountAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        to: metaMultiSigWallet.address,
        value: "0",
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        batchItemIds: selectedIds,
        userAddress: walletClient.account.address,
        vk: vk ? Buffer.from(vk).toString("base64") : undefined,
      });

      if (result) {
        notification.success("Batch transaction created! Waiting for approvals.");
      }

      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Propose batch error:", error);
      notification.error(formatErrorMessage(error, "Failed to propose batch"));
    } finally {
      reset();
    }
  };

  return {
    proposeBatch,
    isLoading,
    loadingState,
    loadingStep,
    totalSteps,
  };
};
