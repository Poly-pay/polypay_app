import { useState } from "react";
import {
  LZ_ENDPOINT_IDS,
  OP_BRIDGE_ADDRESSES,
  SignerData,
  TxStatus,
  TxType,
  ZERO_ADDRESS,
  encodeAddSigners,
  encodeApproveAndCall,
  encodeBatchTransfer,
  encodeBatchTransferMulti,
  encodeBridgeETHTo,
  encodeERC20Transfer,
  encodeLzSend,
  encodeRemoveSigners,
  encodeUpdateThreshold,
  getBridgeContract,
  getBridgeMechanism,
  getOftCmd,
  getTokenByAddress,
  removeDust,
} from "@polypay/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";
import { accountKeys, useMetaMultiSigWallet, useNetworkTokens, userKeys } from "~~/hooks";
import { useApproveTransaction, useDenyTransaction, useExecuteTransaction } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { formatErrorMessage } from "~~/lib/form/utils";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { notification } from "~~/utils/scaffold-eth";

interface UseTransactionVoteOptions {
  onSuccess?: () => void;
}

export type VoteStatus = "approved" | "denied";

export interface Member {
  commitment: string;
  name: string | null;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus;
}

export interface BatchTransfer {
  recipient: string;
  amount: string;
  contactId?: string;
  contactName?: string;
  tokenAddress?: string;
}

export interface TransactionRowData {
  id: string;
  txId: number;
  type: TxType;
  nonce: number;
  status: TxStatus;
  txHash?: string;
  amount?: string;
  recipientAddress?: string;
  tokenAddress?: string;
  signerData?: SignerData[] | null;
  oldThreshold?: number;
  newThreshold?: number;
  batchData?: BatchTransfer[];
  destChainId?: number;
  bridgeFee?: string;
  bridgeMinAmount?: string;
  contact?: {
    id: string;
    name: string;
    address: string;
  };
  members: Member[];
  votedCount: number;
  threshold: number;
  approveCount: number;
  myVoteStatus: VoteStatus | null;
  accountAddress: string;
}

/**
 * Build callData, to, and value based on transaction type.
 * For cross-chain TRANSFER, must reconstruct bridge execution params
 * to produce the same txHash as the creator and backend.
 */
function buildTransactionParams(
  tx: TransactionRowData,
  sourceChainId: number,
  bridgeFee?: string,
): {
  to: `0x${string}`;
  value: bigint;
  callData: `0x${string}`;
} {
  let callData: `0x${string}` = "0x";
  let to: `0x${string}` = tx.recipientAddress as `0x${string}`;
  let value = BigInt(tx.amount || "0");

  if (tx.type === TxType.TRANSFER) {
    const isCrossChain = tx.destChainId && tx.destChainId !== sourceChainId;

    if (isCrossChain) {
      return buildBridgeTransactionParams(tx, sourceChainId, bridgeFee);
    }

    if (tx.tokenAddress && tx.tokenAddress !== ZERO_ADDRESS) {
      to = tx.tokenAddress as `0x${string}`;
      value = 0n;
      callData = encodeERC20Transfer(tx.recipientAddress!, BigInt(tx.amount || "0")) as `0x${string}`;
    }
  } else {
    // For non-transfer types, to = account address
    to = tx.accountAddress as `0x${string}`;
    value = 0n;

    if (tx.type === TxType.ADD_SIGNER) {
      const commitments = tx.signerData?.map(s => s.commitment) || [];
      callData = encodeAddSigners(commitments, tx.newThreshold!);
    } else if (tx.type === TxType.REMOVE_SIGNER) {
      const commitments = tx.signerData?.map(s => s.commitment) || [];
      callData = encodeRemoveSigners(commitments, tx.newThreshold!);
    } else if (tx.type === TxType.SET_THRESHOLD) {
      callData = encodeUpdateThreshold(tx.newThreshold!);
    } else if (tx.type === TxType.BATCH && tx.batchData) {
      const recipients = tx.batchData.map(item => item.recipient as `0x${string}`);
      const amounts = tx.batchData.map(item => BigInt(item.amount));
      const tokenAddresses = tx.batchData.map(item => item.tokenAddress || ZERO_ADDRESS);

      const hasERC20 = tokenAddresses.some(addr => addr !== ZERO_ADDRESS);

      callData = hasERC20
        ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
        : encodeBatchTransfer(recipients, amounts);
    }
  }

  return { to, value, callData };
}

function buildBridgeTransactionParams(
  tx: TransactionRowData,
  sourceChainId: number,
  bridgeFee?: string,
): { to: `0x${string}`; value: bigint; callData: `0x${string}` } {
  const destChainId = tx.destChainId!;
  const isNativeETH = !tx.tokenAddress || tx.tokenAddress === ZERO_ADDRESS;
  const tokenSymbol = isNativeETH ? "ETH" : getTokenSymbolFromAddress(tx.tokenAddress!, sourceChainId);
  const mechanism = getBridgeMechanism(sourceChainId, destChainId, tokenSymbol);
  const amount = BigInt(tx.amount || "0");
  const fee = bridgeFee ? BigInt(bridgeFee) : 0n;
  const recipient = tx.recipientAddress!;

  if (mechanism === "OP_STACK") {
    const bridgeAddress = OP_BRIDGE_ADDRESSES[sourceChainId];
    return {
      to: bridgeAddress as `0x${string}`,
      value: amount,
      callData: encodeBridgeETHTo(recipient) as `0x${string}`,
    };
  }

  // LAYERZERO
  const dstEid = LZ_ENDPOINT_IDS[destChainId];
  const oftEntry = getBridgeContract(tokenSymbol, sourceChainId);

  if (!dstEid || !oftEntry) {
    throw new Error(`No bridge route for ${tokenSymbol} from ${sourceChainId} to ${destChainId}`);
  }

  const token = getTokenByAddress(tx.tokenAddress, sourceChainId);
  const minAmount = tx.bridgeMinAmount ? BigInt(tx.bridgeMinAmount) : removeDust(amount, token.decimals);
  const oftCmd = getOftCmd(oftEntry);

  const lzSendData = encodeLzSend(dstEid, recipient, amount, minAmount, fee, tx.accountAddress, oftCmd);

  if (oftEntry.type === "adapter") {
    return {
      to: tx.accountAddress as `0x${string}`,
      value: 0n,
      callData: encodeApproveAndCall(
        tx.tokenAddress!,
        oftEntry.address,
        amount,
        oftEntry.address,
        fee,
        lzSendData,
      ) as `0x${string}`,
    };
  }

  return {
    to: oftEntry.address as `0x${string}`,
    value: fee,
    callData: lzSendData as `0x${string}`,
  };
}

function getTokenSymbolFromAddress(tokenAddress: string, chainId: number): string {
  const token = getTokenByAddress(tokenAddress, chainId);
  return token.symbol;
}

export const useTransactionVote = (options?: UseTransactionVoteOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { commitment } = useIdentityStore();
  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { chainId: sourceChainId } = useNetworkTokens();

  const { mutateAsync: approveApi } = useApproveTransaction();
  const { mutateAsync: denyApi } = useDenyTransaction();
  const { mutateAsync: executeApi } = useExecuteTransaction();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });
  const queryClient = useQueryClient();

  const approve = async (tx: TransactionRowData) => {
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    if (!commitment) {
      notification.error("No commitment found");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Build callData based on tx type (pass sourceChainId for cross-chain bridge reconstruction)
      const { to, value, callData } = buildTransactionParams(tx, sourceChainId, tx.bridgeFee);

      // 2. Get txHash from contract
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        BigInt(tx.nonce),
        to,
        value,
        callData,
      ])) as `0x${string}`;

      // 3. Generate ZK proof
      const proofData = await generateProof(txHash);

      // 4. Submit to backend
      setLoadingState("Submitting to backend...");
      await approveApi({
        txId: tx.txId,
        dto: {
          proof: proofData.proof,
          publicInputs: proofData.publicInputs,
          nullifier: proofData.nullifier,
          userAddress: walletClient.account.address,
          vk: proofData.vk ? Buffer.from(proofData.vk).toString("base64") : undefined,
        },
      });

      notification.success("Vote submitted!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Approve error:", error);
      notification.error(formatErrorMessage(error, "Failed to approve"));
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const deny = async (tx: TransactionRowData) => {
    if (!walletClient) {
      notification.error("Wallet not connected");
      return;
    }

    if (!commitment) {
      notification.error("No commitment found");
      return;
    }

    setIsLoading(true);
    try {
      setLoadingState("Submitting deny vote...");
      await denyApi({
        txId: tx.txId,
        dto: {
          userAddress: walletClient.account.address,
        },
      });

      notification.success("Deny vote submitted!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Deny error:", error);
      notification.error(formatErrorMessage(error, "Failed to deny"));
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const execute = async (txId: number) => {
    if (!walletClient) {
      notification.error("Wallet not connected");
      return;
    }

    setIsLoading(true);
    try {
      setLoadingState("Executing on-chain...");
      const result = await executeApi({
        txId,
        dto: {
          userAddress: walletClient.account.address,
        },
      });

      console.log("Transaction executed:", result.txHash);
      notification.success("Transaction executed successfully!");

      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({
        queryKey: accountKeys.byAddress(metaMultiSigWallet?.address || ""),
      });
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Execute error:", error);
      notification.error(formatErrorMessage("Failed to execute"));
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  return {
    approve,
    deny,
    execute,
    isLoading,
    loadingState,
  };
};
