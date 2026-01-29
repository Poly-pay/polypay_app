import { useState } from "react";
import { TxType, encodeERC20Transfer } from "@polypay/shared";
import { NATIVE_ETH, Token, parseTokenAmount } from "@polypay/shared";
import { parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { notification } from "~~/utils/scaffold-eth";

interface TransferParams {
  recipient: string;
  amount: string;
  token: Token;
  contactId?: string | null;
}

interface UseTransferTransactionOptions {
  onSuccess?: () => void;
}

export const useTransferTransaction = (options?: UseTransferTransactionOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });

  const transfer = async ({ recipient, amount, token, contactId }: TransferParams) => {
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    const isNativeETH = token.address === NATIVE_ETH.address;

    setIsLoading(true);
    try {
      // 1. Reserve nonce from backend
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      setLoadingState("Preparing transaction...");
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
      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      // 6. Submit to backend
      setLoadingState("Submitting to backend...");
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
      });

      if (result) {
        notification.success("Transfer transaction created! Waiting for approvals.");
      }

      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error(error.message || "Failed to create transfer");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  return {
    transfer,
    isLoading,
    loadingState,
  };
};
