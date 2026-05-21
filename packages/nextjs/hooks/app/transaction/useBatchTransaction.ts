import { createTransactionSteps } from "./transactionSteps";
import { BatchItem, TxType, ZERO_ADDRESS, encodeBatchTransfer, encodeBatchTransferMulti } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useStepLoading } from "~~/hooks/app/useStepLoading";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

interface UseBatchTransactionOptions {
  onSuccess?: () => void;
}

export const useBatchTransaction = (options?: UseBatchTransactionOptions) => {
  const { isLoading, loadingState, loadingStep, totalSteps, startStep, setStepByLabel, reset } = useStepLoading(
    createTransactionSteps("batch"),
  );

  const { data: walletClient } = useWalletClient();
  const { secret, commitment: myCommitment } = useIdentityStore();
  const { currentAccount } = useAccountStore();
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
      const { nonce } = await reserveNonce({
        accountAddress: metaMultiSigWallet.address,
        chainId: currentAccount!.chainId,
      });

      // 2. Get current threshold
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // 3. Build (to, value, data)
      const recipients = selectedBatchItems.map(item => item.recipient as `0x${string}`);
      const amounts: bigint[] = selectedBatchItems.map(item => BigInt(item.amount));
      const tokenAddresses = selectedBatchItems.map(item => item.tokenAddress || ZERO_ADDRESS);

      const hasERC20 = tokenAddresses.some(addr => addr !== ZERO_ADDRESS);
      const batchTransferData = hasERC20
        ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
        : encodeBatchTransfer(recipients, amounts);

      const toAddress = metaMultiSigWallet.address;
      const txValue = 0n;
      const txData = batchTransferData as `0x${string}`;

      // 4. Calculate txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        toAddress,
        txValue,
        txData,
      ])) as `0x${string}`;

      // 5. Generate ZK proof
      const { proof, publicInputs, nullifier, vk } = await generateProof(txHash);

      // 6. Submit to backend
      startStep(4);
      const result = await createTransaction({
        nonce,
        type: TxType.BATCH,
        accountAddress: metaMultiSigWallet.address,
        chainId: currentAccount!.chainId,
        threshold: Number(currentThreshold),
        to: toAddress,
        value: txValue.toString(),
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        batchItemIds: selectedIds,
        userAddress: walletClient.account.address,
        vk,
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
