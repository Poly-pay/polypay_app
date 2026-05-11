import { useState } from "react";
import { createTransactionSteps } from "./transactionSteps";
import {
  BatchItem,
  TxType,
  ZERO_ADDRESS,
  encodeBatchTransfer,
  encodeBatchTransferMulti,
  isStealthSupportedChain,
  isStealthSupportedToken,
} from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useStepLoading } from "~~/hooks/app/useStepLoading";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";
import { buildStealthBatchCall } from "~~/utils/stealth";
import { deriveStealthEntries } from "~~/utils/stealthEntries";

const UMBRA_TOLL = 0n;
const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";

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

      // Stealth + regular cannot be mixed in one multisig.execute (one call
      // can only target one contract). Force HR to keep batches single-kind.
      const stealthItems = selectedBatchItems.filter(i => i.sendPrivately);
      const regularItems = selectedBatchItems.filter(i => !i.sendPrivately);
      if (stealthItems.length > 0 && regularItems.length > 0) {
        notification.error("Cannot mix stealth and regular items in one batch. Propose them separately.");
        return;
      }

      const useStealth = stealthItems.length > 0;
      const chainId = currentAccount?.chainId;

      if (useStealth) {
        if (!chainId || !isStealthSupportedChain(chainId)) {
          notification.error("Stealth payments are only available on Base mainnet");
          return;
        }
        for (const item of stealthItems) {
          if (!isStealthSupportedToken(chainId, item.tokenAddress || ZERO_ADDRESS)) {
            notification.error("Stealth payments support only ETH and USDC. Remove unsupported items.");
            return;
          }
        }
      }

      // 1. Reserve nonce from backend
      startStep(1);
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // 3. Build (to, value, data)
      let toAddress: `0x${string}`;
      let txValue: bigint;
      let txData: `0x${string}`;

      if (useStealth) {
        const stealthInputs = stealthItems.map(item => ({
          recipient: item.recipient,
          tokenAddress: item.tokenAddress || ZERO_ADDRESS,
          amount: BigInt(item.amount),
        }));
        const derived = await deriveStealthEntries(chainId!, DEFAULT_BASE_RPC_URL, stealthInputs);
        const built = buildStealthBatchCall(
          chainId!,
          UMBRA_TOLL,
          derived.map(d => d.entry),
        );
        toAddress = built.to as `0x${string}`;
        txValue = built.value;
        txData = built.data as `0x${string}`;
      } else {
        const recipients = regularItems.map(item => item.recipient as `0x${string}`);
        const amounts: bigint[] = regularItems.map(item => BigInt(item.amount));
        const tokenAddresses = regularItems.map(item => item.tokenAddress || ZERO_ADDRESS);

        const hasERC20 = tokenAddresses.some(addr => addr !== ZERO_ADDRESS);
        const batchTransferData = hasERC20
          ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
          : encodeBatchTransfer(recipients, amounts);

        toAddress = metaMultiSigWallet.address;
        txValue = 0n;
        txData = batchTransferData as `0x${string}`;
      }

      // 4. Calculate txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        toAddress,
        txValue,
        txData,
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
