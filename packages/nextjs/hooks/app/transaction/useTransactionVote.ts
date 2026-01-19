import { useState } from "react";
import {
  TxStatus,
  TxType,
  encodeAddSigners,
  encodeBatchTransfer,
  encodeBatchTransferMulti,
  encodeERC20Transfer,
  encodeRemoveSigners,
  encodeUpdateThreshold,
} from "@polypay/shared";
import { NATIVE_ETH } from "@polypay/shared";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useApproveTransaction, useDenyTransaction, useExecuteTransaction } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
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
  signerCommitments?: string[];
  oldThreshold?: number;
  newThreshold?: number;
  batchData?: BatchTransfer[];
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
 * Build callData, to, and value based on transaction type
 */
function buildTransactionParams(tx: TransactionRowData): {
  to: `0x${string}`;
  value: bigint;
  callData: `0x${string}`;
} {
  let callData: `0x${string}` = "0x";
  let to: `0x${string}` = tx.recipientAddress as `0x${string}`;
  let value = BigInt(tx.amount || "0");

  if (tx.type === TxType.TRANSFER) {
    // Check if ERC20 transfer
    if (tx.tokenAddress && tx.tokenAddress !== NATIVE_ETH.address) {
      to = tx.tokenAddress as `0x${string}`;
      value = 0n;
      callData = encodeERC20Transfer(tx.recipientAddress!, BigInt(tx.amount || "0")) as `0x${string}`;
    }
  } else {
    // For non-transfer types, to = account address
    to = tx.accountAddress as `0x${string}`;
    value = 0n;

    if (tx.type === TxType.ADD_SIGNER) {
      callData = encodeAddSigners(tx.signerCommitments!, tx.newThreshold!);
    } else if (tx.type === TxType.REMOVE_SIGNER) {
      callData = encodeRemoveSigners(tx.signerCommitments!, tx.newThreshold!);
    } else if (tx.type === TxType.SET_THRESHOLD) {
      callData = encodeUpdateThreshold(tx.newThreshold!);
    } else if (tx.type === TxType.BATCH && tx.batchData) {
      const recipients = tx.batchData.map(item => item.recipient as `0x${string}`);
      const amounts = tx.batchData.map(item => BigInt(item.amount));
      const tokenAddresses = tx.batchData.map(item => item.tokenAddress || NATIVE_ETH.address);

      const hasERC20 = tokenAddresses.some(addr => addr !== NATIVE_ETH.address);

      callData = hasERC20
        ? encodeBatchTransferMulti(recipients, amounts, tokenAddresses)
        : encodeBatchTransfer(recipients, amounts);
    }
  }

  return { to, value, callData };
}

export const useTransactionVote = (options?: UseTransactionVoteOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { commitment } = useIdentityStore();
  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();

  const { mutateAsync: approveApi } = useApproveTransaction();
  const { mutateAsync: denyApi } = useDenyTransaction();
  const { mutateAsync: executeApi } = useExecuteTransaction();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });

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
      // 1. Build callData based on tx type
      const { to, value, callData } = buildTransactionParams(tx);

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
        },
      });

      notification.success("Vote submitted!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Approve error:", error);
      notification.error(error.message || "Failed to approve");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const deny = async (tx: TransactionRowData) => {
    if (!commitment) {
      notification.error("No commitment found");
      return;
    }

    setIsLoading(true);
    try {
      setLoadingState("Submitting deny vote...");
      await denyApi({
        txId: tx.txId,
      });

      notification.success("Deny vote submitted!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Deny error:", error);
      notification.error(error.message || "Failed to deny");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const execute = async (txId: number) => {
    setIsLoading(true);
    try {
      setLoadingState("Executing on-chain...");
      const result = await executeApi(txId);

      console.log("Transaction executed:", result.txHash);
      notification.success("Transaction executed successfully!");
      options?.onSuccess?.();
    } catch (error: any) {
      console.error("Execute error:", error);
      notification.error(error.message || "Failed to execute");
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
