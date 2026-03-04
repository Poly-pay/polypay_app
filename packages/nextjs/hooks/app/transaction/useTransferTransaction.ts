import { useState } from "react";
import {
  LZ_ENDPOINT_IDS,
  OFT_ABI,
  OP_BRIDGE_ADDRESSES,
  ResolvedToken,
  TxType,
  ZERO_ADDRESS,
  encodeApproveAndCall,
  encodeBridgeETHTo,
  encodeERC20Transfer,
  encodeLzSend,
  getBridgeContract,
  getBridgeMechanism,
  getOftCmd,
  parseTokenAmount,
  removeDust,
} from "@polypay/shared";
import { type Hex, createPublicClient, http, parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet, useNetworkTokens } from "~~/hooks";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { formatErrorMessage } from "~~/lib/form/utils";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

interface TransferParams {
  recipient: string;
  amount: string;
  token: ResolvedToken;
  contactId?: string | null;
  destChainId?: number;
}

interface UseTransferTransactionOptions {
  onSuccess?: () => void;
}

export const useTransferTransaction = (options?: UseTransferTransactionOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { chainId: sourceChainId } = useNetworkTokens();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });

  const transfer = async ({ recipient, amount, token, contactId, destChainId }: TransferParams) => {
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    const isNativeETH = token.address === ZERO_ADDRESS;
    const isCrossChain = destChainId !== undefined && destChainId !== sourceChainId;

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
      let bridgeFee: string | undefined;
      let bridgeMinAmount: string | undefined;

      if (isCrossChain) {
        const bridgeResult = await buildBridgeParams({
          recipient,
          valueInSmallestUnit,
          token,
          isNativeETH,
          sourceChainId,
          destChainId,
          walletAddress: metaMultiSigWallet.address,
          setLoadingState,
        });

        bridgeFee = bridgeResult.bridgeFee;
        bridgeMinAmount = bridgeResult.bridgeMinAmount;

        txHash = (await metaMultiSigWallet.read.getTransactionHash([
          BigInt(nonce),
          bridgeResult.to as `0x${string}`,
          BigInt(bridgeResult.value),
          bridgeResult.data as `0x${string}`,
        ])) as `0x${string}`;
      } else if (isNativeETH) {
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
        destChainId: isCrossChain ? destChainId : undefined,
        bridgeFee,
        bridgeMinAmount,
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        userAddress: walletClient.account.address,
        vk: vk ? Buffer.from(vk).toString("base64") : undefined,
      });

      if (result) {
        const msg = isCrossChain
          ? "Cross-chain transfer created! Waiting for approvals."
          : "Transfer transaction created! Waiting for approvals.";
        notification.success(msg);
      }

      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error(formatErrorMessage(error, "Failed to create transfer"));
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

// ─── Bridge param builder (stateless helper) ───

async function buildBridgeParams({
  recipient,
  valueInSmallestUnit,
  token,
  isNativeETH,
  sourceChainId,
  destChainId,
  walletAddress,
  setLoadingState,
}: {
  recipient: string;
  valueInSmallestUnit: string;
  token: ResolvedToken;
  isNativeETH: boolean;
  sourceChainId: number;
  destChainId: number;
  walletAddress: string;
  setLoadingState: (s: string) => void;
}): Promise<{ to: string; value: string; data: Hex; bridgeFee?: string; bridgeMinAmount?: string }> {
  const tokenSymbol = isNativeETH ? "ETH" : token.symbol;
  const mechanism = getBridgeMechanism(sourceChainId, destChainId, tokenSymbol);

  if (!mechanism) {
    throw new Error(`No bridge route for ${tokenSymbol} from ${sourceChainId} to ${destChainId}`);
  }

  const amount = BigInt(valueInSmallestUnit);

  if (mechanism === "OP_STACK") {
    const bridgeAddress = OP_BRIDGE_ADDRESSES[sourceChainId];
    if (!bridgeAddress) throw new Error(`No OP bridge on chain ${sourceChainId}`);

    return {
      to: bridgeAddress,
      value: amount.toString(),
      data: encodeBridgeETHTo(recipient),
    };
  }

  // LAYERZERO
  const dstEid = LZ_ENDPOINT_IDS[destChainId];
  if (!dstEid) throw new Error(`No LZ endpoint for chain ${destChainId}`);

  const oftEntry = getBridgeContract(tokenSymbol, sourceChainId);
  if (!oftEntry) throw new Error(`No OFT contract for ${tokenSymbol} on chain ${sourceChainId}`);

  const chain = scaffoldConfig.targetNetworks.find(n => n.id === sourceChainId);
  if (!chain) throw new Error(`Chain ${sourceChainId} not in target networks`);

  const publicClient = createPublicClient({ chain, transport: http() });

  const oftCmd = getOftCmd(oftEntry);
  const toBytes32 = `0x${recipient.slice(2).padStart(64, "0")}` as `0x${string}`;

  // For Stargate OFTs, call quoteOFT to get amountReceivedLD (accounts for protocol fee).
  // For standard OFTs, removeDust is sufficient.
  let minAmount: bigint;
  if (oftEntry.stargate) {
    setLoadingState("Quoting Stargate fee...");
    const quoteResult = (await publicClient.readContract({
      address: oftEntry.address as `0x${string}`,
      abi: OFT_ABI,
      functionName: "quoteOFT",
      args: [
        {
          dstEid,
          to: toBytes32,
          amountLD: amount,
          minAmountLD: 0n,
          extraOptions: "0x" as Hex,
          composeMsg: "0x" as Hex,
          oftCmd: oftCmd as Hex,
        },
      ],
    })) as [
      { minAmountLD: bigint; maxAmountLD: bigint },
      { feeAmountLD: bigint; description: string }[],
      { amountSentLD: bigint; amountReceivedLD: bigint },
    ];
    minAmount = quoteResult[2].amountReceivedLD;
  } else {
    minAmount = removeDust(amount, token.decimals);
  }

  const sendParam = {
    dstEid,
    to: toBytes32,
    amountLD: amount,
    minAmountLD: minAmount,
    extraOptions: "0x" as Hex,
    composeMsg: "0x" as Hex,
    oftCmd: oftCmd as Hex,
  };

  setLoadingState("Quoting LayerZero fee...");
  const quotedFee = (await publicClient.readContract({
    address: oftEntry.address as `0x${string}`,
    abi: OFT_ABI,
    functionName: "quoteSend",
    args: [sendParam, false],
  })) as { nativeFee: bigint; lzTokenFee: bigint };

  const nativeFee = quotedFee.nativeFee;

  const lzSendData = encodeLzSend(dstEid, recipient, amount, minAmount, nativeFee, walletAddress, oftCmd as Hex);

  if (oftEntry.type === "adapter") {
    return {
      to: walletAddress,
      value: "0",
      data: encodeApproveAndCall(token.address, oftEntry.address, amount, oftEntry.address, nativeFee, lzSendData),
      bridgeFee: nativeFee.toString(),
      bridgeMinAmount: minAmount.toString(),
    };
  }

  return {
    to: oftEntry.address,
    value: nativeFee.toString(),
    data: lzSendData,
    bridgeFee: nativeFee.toString(),
    bridgeMinAmount: minAmount.toString(),
  };
}
