import { useState } from "react";
import { BatchItem, TxType, ZERO_ADDRESS, encodeBatchTransfer, encodeBatchTransferMulti } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useIdentityStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

interface UseBatchTransactionOptions {
  onSuccess?: () => void;
}

export const useBatchTransaction = (options?: UseBatchTransactionOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const { secret, commitment: myCommitment } = useIdentityStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
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

    setIsLoading(true);

    try {
      const selectedIds = selectedBatchItems.map(item => item.id);

      // 1. Reserve nonce from backend
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      setLoadingState("Preparing batch transaction...");
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
      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      // 7. Submit to backend
      setLoadingState("Submitting to backend...");
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
      });

      if (result) {
        notification.success("Batch transaction created! Waiting for approvals.");
      }

      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Propose batch error:", error);
      notification.error(error.message || "Failed to propose batch");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  return {
    proposeBatch,
    isLoading,
    loadingState,
  };
};
