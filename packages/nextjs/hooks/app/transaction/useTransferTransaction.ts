import { useEffect } from "react";
import { ResolvedToken, TxType, ZERO_ADDRESS, encodeERC20Transfer, parseTokenAmount } from "@polypay/shared";
import { parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useStepLoading } from "~~/hooks/app/useStepLoading";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

interface TransferParams {
  recipient: string;
  amount: string;
  token: ResolvedToken;
  contactId?: string | null;
}

interface UseTransferTransactionOptions {
  onSuccess?: () => void;
}

const TRANSFER_STEPS = [
  { id: 1, label: "Preparing your transfer..." },
  { id: 2, label: "Waiting for wallet approval..." },
  { id: 3, label: "Securing your transaction..." },
  { id: 4, label: "Almost done, submitting..." },
];

export const useTransferTransaction = (options?: UseTransferTransactionOptions) => {
  const { isLoading, loadingState, loadingStep, totalSteps, startStep, setStepByLabel, reset } =
    useStepLoading(TRANSFER_STEPS);

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setStepByLabel,
  });

  const transfer = async ({ recipient, amount, token, contactId }: TransferParams) => {
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    const isNativeETH = token.address === ZERO_ADDRESS;
    try {
      // 1. Reserve nonce from backend
      startStep(1);
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      startStep(1);
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // 3. Parse amount based on token type
      const valueInSmallestUnit = isNativeETH
        ? parseEther(amount).toString()
        : parseTokenAmount(amount, token.decimals);

      // 4. Calculate txHash (different for ETH vs ERC20)
      let txHash: `0x${string}`;

      if (isNativeETH) {
        // ETH: to = recipient, value = amount, data = 0x
        txHash = (await metaMultiSigWallet.read.getTransactionHash([
          BigInt(nonce),
          recipient as `0x${string}`,
          BigInt(valueInSmallestUnit),
          "0x" as `0x${string}`,
        ])) as `0x${string}`;
      } else {
        // ERC20: to = tokenAddress, value = 0, data = transfer(recipient, amount)
        const encodedData = encodeERC20Transfer(recipient, BigInt(valueInSmallestUnit));
        txHash = (await metaMultiSigWallet.read.getTransactionHash([
          BigInt(nonce),
          token.address as `0x${string}`,
          0n,
          encodedData as `0x${string}`,
        ])) as `0x${string}`;
      }

      // 5. Generate ZK proof
      const { proof, publicInputs, nullifier, vk } = await generateProof(txHash);

      // 6. Submit to backend
      startStep(4);
      const result = await createTransaction({
        nonce,
        type: TxType.TRANSFER,
        accountAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        to: recipient,
        value: valueInSmallestUnit,
        tokenAddress: isNativeETH ? undefined : token.address,
        contactId: contactId || undefined,
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        userAddress: walletClient.account.address,
        vk: vk ? Buffer.from(vk).toString("base64") : undefined,
      });

      if (result) {
        notification.success("Transfer transaction created! Waiting for approvals.");
      }

      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error(formatErrorMessage(error, "Failed to create transfer"));
    } finally {
      reset();
    }
  };

  return {
    transfer,
    isLoading,
    loadingState,
    loadingStep,
    totalSteps,
  };
};
