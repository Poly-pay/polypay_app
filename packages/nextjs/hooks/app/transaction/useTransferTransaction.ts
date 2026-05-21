import { useEffect } from "react";
import { createTransactionSteps } from "./transactionSteps";
import {
  ResolvedToken,
  TxType,
  ZERO_ADDRESS,
  encodeERC20Transfer,
  isStealthSupportedChain,
  isStealthSupportedToken,
  parseTokenAmount,
} from "@polypay/shared";
import { parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useStepLoading } from "~~/hooks/app/useStepLoading";
import { useAccountStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";
import { buildStealthBatchCall, getUmbraToll } from "~~/utils/stealth";
import { deriveStealthEntries } from "~~/utils/stealthEntries";

interface TransferParams {
  recipient: string;
  amount: string;
  token: ResolvedToken;
  contactId?: string | null;
  sendPrivately?: boolean;
}

// Public mainnet.base.org rejects browser-origin requests (403). Use the
// same Base RPC override the rest of the app relies on (scaffold.config.ts).
const DEFAULT_BASE_RPC_URL = "https://base-rpc.publicnode.com";

interface UseTransferTransactionOptions {
  onSuccess?: () => void;
}

export const useTransferTransaction = (options?: UseTransferTransactionOptions) => {
  const { isLoading, loadingState, loadingStep, totalSteps, startStep, setStepByLabel, reset } = useStepLoading(
    createTransactionSteps("transfer"),
  );

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { currentAccount } = useAccountStore();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setStepByLabel,
  });

  const transfer = async ({ recipient, amount, token, contactId, sendPrivately }: TransferParams) => {
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    const isNativeETH = token.address === ZERO_ADDRESS;
    const chainId = currentAccount?.chainId;

    if (sendPrivately) {
      if (!chainId || !isStealthSupportedChain(chainId)) {
        notification.error("Stealth payments are only available on Base mainnet");
        return;
      }
      if (!isStealthSupportedToken(chainId, token.address)) {
        notification.error("Stealth payments support only ETH and USDC");
        return;
      }
    }

    try {
      // 1. Reserve nonce from backend
      startStep(1);
      const { nonce } = await reserveNonce({
        accountAddress: metaMultiSigWallet.address,
        chainId: currentAccount!.chainId,
      });

      // 2. Get current threshold and commitments
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();

      // 3. Parse amount based on token type
      const valueInSmallestUnit = isNativeETH
        ? parseEther(amount).toString()
        : parseTokenAmount(amount, token.decimals);

      // 4. Build (to, value, data) — stealth path replaces the recipient with a
      //    fresh stealth address and routes through Umbra's batch contract so a
      //    proper Announcement event is emitted.
      let toAddress: `0x${string}`;
      let txValue: bigint;
      let txData: `0x${string}`;
      let stealthData: string | undefined;

      if (sendPrivately) {
        const [{ entry }] = await deriveStealthEntries(chainId!, DEFAULT_BASE_RPC_URL, [
          {
            recipient,
            tokenAddress: token.address,
            amount: BigInt(valueInSmallestUnit),
          },
        ]);
        const toll = await getUmbraToll(chainId!, DEFAULT_BASE_RPC_URL);
        const built = buildStealthBatchCall(chainId!, toll, [entry]);
        toAddress = built.to as `0x${string}`;
        txValue = built.value;
        txData = built.data as `0x${string}`;
        // Persist the exact on-chain call so the executor and any approver
        // can recompute the same txHash without needing the ephemeral entropy.
        stealthData = JSON.stringify({
          to: toAddress,
          value: txValue.toString(),
          data: txData,
        });
      } else if (isNativeETH) {
        toAddress = recipient as `0x${string}`;
        txValue = BigInt(valueInSmallestUnit);
        txData = "0x";
      } else {
        toAddress = token.address as `0x${string}`;
        txValue = 0n;
        txData = encodeERC20Transfer(recipient, BigInt(valueInSmallestUnit)) as `0x${string}`;
      }

      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(nonce),
        toAddress,
        txValue,
        txData,
      ])) as `0x${string}`;

      // 5. Generate ZK proof
      const { proof, publicInputs, nullifier, vk } = await generateProof(txHash);

      // 6. Submit to backend. For stealth, we record the ORIGINAL recipient and
      //    token in the transaction row (so the UI keeps showing "Alice / USDC"),
      //    and pass stealthData so the executor knows to call UmbraBatchSend.
      startStep(4);
      const result = await createTransaction({
        nonce,
        type: TxType.TRANSFER,
        accountAddress: metaMultiSigWallet.address,
        chainId: currentAccount!.chainId,
        threshold: Number(currentThreshold),
        to: recipient,
        value: valueInSmallestUnit,
        tokenAddress: isNativeETH ? undefined : token.address,
        contactId: contactId || undefined,
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        userAddress: walletClient.account.address,
        vk,
        stealthData,
      });

      if (result) {
        notification.success(
          sendPrivately
            ? "Private transfer created. Waiting for approvals."
            : "Transfer transaction created! Waiting for approvals.",
        );
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
