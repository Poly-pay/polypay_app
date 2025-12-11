"use client";

import React, { useState } from "react";
import Image from "next/image";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { formatEther } from "viem";
import { useWalletClient } from "wagmi";
import { useMetaMultiSigWallet } from "~~/hooks/api";
import {
  TxStatus as ApiTxStatus,
  TxType as ApiTxType,
  Transaction,
  useApprove,
  useDeny,
  useExecuteOnChain,
} from "~~/hooks/api/useTransaction";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

// components/transaction/TransactionRow.tsx

// ============ Types ============
type TxType = "transfer" | "add_signer" | "remove_signer" | "set_threshold";
type VoteStatus = "approved" | "denied" | "waiting";
type TxStatus = "pending" | "executing" | "executed" | "failed" | "outdated";

interface Member {
  commitment: string;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus;
}

interface TransactionRowData {
  id: string;
  txId: number;
  type: TxType;
  nonce: number;
  status: TxStatus;
  txHash?: string;

  // Transfer
  amount?: string;
  recipientAddress?: string;

  // Add/Remove Signer
  signerCommitment?: string;

  // Set Threshold
  oldThreshold?: number;
  newThreshold?: number;

  // Voting
  members: Member[];
  votedCount: number;
  threshold: number;

  // Current user vote
  myVoteStatus: VoteStatus | null;

  // Wallet
  walletAddress: string;
}

// ============ Helper: Convert API Transaction to Row Data ============
export function convertToRowData(tx: Transaction, myCommitment: string): TransactionRowData {
  // Map API type to UI type
  const typeMap: Record<ApiTxType, TxType> = {
    TRANSFER: "transfer",
    ADD_SIGNER: "add_signer",
    REMOVE_SIGNER: "remove_signer",
    SET_THRESHOLD: "set_threshold",
  };

  // Map API status to UI status
  const statusMap: Record<ApiTxStatus, TxStatus> = {
    PENDING: "pending",
    EXECUTING: "executing",
    EXECUTED: "executed",
    FAILED: "failed",
    OUTDATED: "outdated",
  };

  // Build members from votes
  const members: Member[] = tx.votes.map(vote => ({
    commitment: vote.voterCommitment,
    isInitiator: vote.voterCommitment === tx.createdBy,
    isMe: vote.voterCommitment === myCommitment,
    voteStatus: vote.voteType === "APPROVE" ? "approved" : "denied",
  }));

  // Find my vote
  const myVote = tx.votes.find(v => v.voterCommitment === myCommitment);
  const myVoteStatus: VoteStatus | null = myVote ? (myVote.voteType === "APPROVE" ? "approved" : "denied") : null;

  return {
    id: tx.id,
    txId: tx.txId,
    type: typeMap[tx.type],
    status: statusMap[tx.status],
    nonce: tx.nonce,
    txHash: tx.txHash || undefined,
    amount: tx.value || undefined,
    recipientAddress: tx.to || undefined,
    signerCommitment: tx.signerCommitment || undefined,
    oldThreshold: tx.threshold,
    newThreshold: tx.newThreshold || undefined,
    members,
    votedCount: tx.votes.length,
    threshold: tx.threshold,
    myVoteStatus,
    walletAddress: tx.walletAddress,
  };
}

// ============ Vote Badge Component ============
function VoteBadge({ status }: { status: VoteStatus }) {
  if (status === "approved") {
    return <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">Approved</span>;
  }

  if (status === "denied") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Denied</span>;
  }

  return (
    <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-full">
      Waiting for confirm...
    </span>
  );
}

// ============ Status Badge Component ============
function StatusBadge({ status, txHash }: { status: TxStatus; txHash?: string }) {
  if (status === "executed") {
    return (
      <a
        href={txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
      >
        Succeed
        <ExternalLink size={14} />
      </a>
    );
  }

  if (status === "failed") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Failed</span>;
  }

  if (status === "outdated") {
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">Outdated</span>;
  }

  return null;
}

// ============ Action Buttons Component ============
function ActionButtons({
  onApprove,
  onDeny,
  onExecute,
  loading,
  txStatus,
}: {
  onApprove: () => void;
  onDeny: () => void;
  onExecute: () => void;
  loading: boolean;
  txStatus?: TxStatus;
}) {
  if (txStatus === "executing") {
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          onExecute();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        Execute
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={e => {
          e.stopPropagation();
          onDeny();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        Deny
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onApprove();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-white bg-[#FF7CEB] rounded-full hover:bg-[#f35ddd] transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}

// ============ Transaction Header (Purple) Component ============
function TxHeader({ tx }: { tx: TransactionRowData }) {
  if (tx.type === "transfer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Transfer</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Image src="/token/eth.svg" alt="ETH" width={20} height={20} />
            <span>{formatEther(BigInt(tx.amount ?? "0"))} ETH</span>
          </div>
          <ArrowRight size={20} />
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <span>{tx.recipientAddress}</span>
          </div>
        </div>
      </div>
    );
  }

  if (tx.type === "add_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-4">Add Signer</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 10)}...{tx.signerCommitment?.slice(-8)}
          </span>
        </div>
      </div>
    );
  }

  if (tx.type === "remove_signer") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Remove Signer</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 10)}...{tx.signerCommitment?.slice(-8)}
          </span>
        </div>
      </div>
    );
  }

  if (tx.type === "set_threshold") {
    return (
      <div className="bg-[#6D2EFF] text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">Set Threshold</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{tx.oldThreshold}</span>
          <ArrowRight size={20} />
          <span className="text-2xl font-bold">{tx.newThreshold}</span>
        </div>
      </div>
    );
  }

  return null;
}

// ============ Member List Component ============
function MemberList({
  members,
  votedCount,
  threshold,
  totalSigners,
}: {
  members: Member[];
  votedCount: number;
  threshold: number;
  totalSigners: number;
}) {
  return (
    <div className="bg-white border border-t-0 rounded-b-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-gray-800">Members</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Voted{" "}
            <span className="font-medium">
              {votedCount}/{totalSigners}
            </span>
          </span>
          <span>
            Threshold{" "}
            <span className="font-medium">
              {threshold}/{totalSigners}
            </span>
          </span>
        </div>
      </div>

      {/* Member Rows */}
      <div className="divide-y">
        {members.map((member, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 font-mono text-sm">
                {member.commitment.slice(0, 8)}...{member.commitment.slice(-6)}
              </span>
              {member.isInitiator && <span className="text-sm text-blue-600">[Initiator]</span>}
              {member.isMe && <span className="text-sm text-orange-500">[me]</span>}
            </div>
            <VoteBadge status={member.voteStatus} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Transaction Type Label ============
function getTxTypeLabel(type: TxType): string {
  switch (type) {
    case "transfer":
      return "Transfer";
    case "add_signer":
      return "Add Signer";
    case "remove_signer":
      return "Remove Signer";
    case "set_threshold":
      return "Threshold";
  }
}

// ============ Transaction Details (Middle) ============
function TxDetails({ tx }: { tx: TransactionRowData }) {
  switch (tx.type) {
    case "transfer":
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/token/eth.svg" alt="ETH" width={20} height={20} />
            <span className="font-medium">{formatEther(BigInt(tx.amount ?? "0"))} ETH</span>
          </div>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.recipientAddress?.slice(0, 6)}...{tx.recipientAddress?.slice(-4)}
          </span>
        </div>
      );

    case "add_signer":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 8)}...{tx.signerCommitment?.slice(-6)}
          </span>
        </div>
      );

    case "remove_signer":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1E1E1E] bg-[#EDEDED] px-5 py-1 rounded-3xl">
            {tx.signerCommitment?.slice(0, 8)}...{tx.signerCommitment?.slice(-6)}
          </span>
        </div>
      );

    case "set_threshold":
      return (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{tx.oldThreshold}</span>
          <Image src="/arrow/arrow-right.svg" alt="Arrow Right" width={100} height={100} />
          <span className="font-semibold text-gray-800">{tx.newThreshold}</span>
        </div>
      );
  }
}

// ============ Main TransactionRow Component ============
interface TransactionRowProps {
  tx: TransactionRowData;
  totalSigners: number;
  onSuccess?: () => void;
}

export function TransactionRow({ tx, totalSigners, onSuccess }: TransactionRowProps) {
  const { commitment, secret } = useIdentityStore();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();

  const { mutateAsync: approve } = useApprove();
  const { mutateAsync: deny } = useDeny();
  const { mutateAsync: executeOnChain, isPending: isExecuting } = useExecuteOnChain();


  // ============ Generate Proof ============
  const generateProof = async () => {
    if (!walletClient || !metaMultiSigWallet) {
      throw new Error("Wallet not connected");
    }

    const currentNonce = await metaMultiSigWallet.read.nonce();

    // 1. Build callData based on tx type
    let callData: `0x${string}` = "0x";
    let to: `0x${string}` = tx.recipientAddress as `0x${string}`;
    let value = BigInt(tx.amount || "0");

    if (tx.type !== "transfer") {
      const { encodeFunctionData } = await import("viem");
      to = tx.walletAddress as `0x${string}`;
      value = 0n;

      if (tx.type === "add_signer") {
        callData = encodeFunctionData({
          abi: [
            {
              name: "addSigner",
              type: "function",
              inputs: [
                { name: "newCommitment", type: "uint256" },
                { name: "newSigRequired", type: "uint256" },
              ],
            },
          ],
          functionName: "addSigner",
          args: [BigInt(tx.signerCommitment!), BigInt(tx.newThreshold!)],
        });
      } else if (tx.type === "remove_signer") {
        callData = encodeFunctionData({
          abi: [
            {
              name: "removeSigner",
              type: "function",
              inputs: [
                { name: "commitment", type: "uint256" },
                { name: "newSigRequired", type: "uint256" },
              ],
            },
          ],
          functionName: "removeSigner",
          args: [BigInt(tx.signerCommitment!), BigInt(tx.newThreshold!)],
        });
      } else if (tx.type === "set_threshold") {
        callData = encodeFunctionData({
          abi: [
            {
              name: "updateSignaturesRequired",
              type: "function",
              inputs: [{ name: "newSigRequired", type: "uint256" }],
            },
          ],
          functionName: "updateSignaturesRequired",
          args: [BigInt(tx.newThreshold!)],
        });
      }
    }

    // 2. Get txHash
    const txHash = (await metaMultiSigWallet.read.getTransactionHash([
      BigInt(currentNonce),
      to,
      value,
      callData,
    ])) as `0x${string}`;

    // 3. Sign
    setLoadingState("Signing transaction...");
    const signature = await walletClient.signMessage({
      message: { raw: txHash },
    });
    const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

    // 4. Get secret
    if (!secret) throw new Error("No secret found");

    const txHashBytes = hexToByteArray(txHash);
    const sigBytes = hexToByteArray(signature).slice(0, 64);
    const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
    const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

    // 5. Get merkle data
    const commitments = await metaMultiSigWallet.read.getCommitments();
    const tree = await buildMerkleTree(commitments ?? []);
    const merkleRoot = await metaMultiSigWallet.read.merkleRoot();

    if (!commitment) throw new Error("No commitment found");

    const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(commitment));
    if (leafIndex === -1) throw new Error("You are not a signer");

    const merklePath = getMerklePath(tree, leafIndex);

    // 6. Generate proof
    setLoadingState("Generating ZK proof...");
    const circuit_json = await fetch("/circuit/target/circuit.json");
    const noir_data = await circuit_json.json();
    const { bytecode, abi } = noir_data;

    const noir = new Noir({ bytecode, abi } as any);
    const execResult = await noir.execute({
      signature: sigBytes,
      pub_key_x: pubKeyX,
      pub_key_y: pubKeyY,
      secret,
      leaf_index: leafIndex,
      merkle_path: merklePath.map(p => p.toString()),
      tx_hash_bytes: txHashBytes,
      tx_hash_commitment: txHashCommitment.toString(),
      merkle_root: merkleRoot?.toString() ?? "",
      nullifier: nullifier.toString(),
    });

    const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
    const { proof, publicInputs } = await plonk.generateProof(execResult.witness);

    return {
      proof: Array.from(proof),
      publicInputs,
      nullifier: nullifier.toString(),
      commitment,
    };
  };

  // ============ Execute on Smart Contract ============
  // const executeOnChain = async () => {
  //   if (!metaMultiSigWallet) return;

  //   setLoadingState("Fetching proofs...");

  //   // Fetch execution data from backend
  //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${tx.txId}/execute`);

  //   if (!response.ok) {
  //     const error = await response.json();
  //     throw new Error(error.message || "Failed to get execution data");
  //   }

  //   const executionData = await response.json();
  //   if (!executionData) {
  //     throw new Error("No execution data found");
  //   }
  //   console.log("🚀 ~ executeOnChain ~ executionData:", executionData);

  //   // Format proofs for contract
  //   const zkProofs = executionData.zkProofs.map((p: any) => ({
  //     nullifier: BigInt(p.nullifier),
  //     aggregationId: BigInt(p.aggregationId),
  //     domainId: BigInt(p.domainId),
  //     zkMerklePath: p.zkMerklePath as `0x${string}`[],
  //     leafCount: BigInt(p.leafCount),
  //     index: BigInt(p.index),
  //   }));

  //   setLoadingState("Executing on-chain...");

  //   // Call contract
  //   const gasEstimate = await metaMultiSigWallet.estimateGas.execute([
  //     executionData.to as `0x${string}`,
  //     BigInt(executionData.value),
  //     executionData.data as `0x${string}`,
  //     zkProofs,
  //   ]);

  //   console.log("Gas estimate for execute:", gasEstimate.toString());
  //   const txHashResult = await metaMultiSigWallet.write.execute(
  //     [executionData.to as `0x${string}`, BigInt(executionData.value), executionData.data as `0x${string}`, zkProofs],
  //     { gas: gasEstimate ? gasEstimate + 10000n : undefined },
  //   );
  //   // Mark as executed
  //   await markExecuted({ txId: tx.txId, txHash: txHashResult });

  //   return txHashResult;
  // };

  // ============ Handle Approve ============
  const handleApprove = async () => {
    if (!commitment) {
      notification.error("No commitment found");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate proof
      const { proof, publicInputs, nullifier, commitment } = await generateProof();

      // 2. Submit to backend
      setLoadingState("Submitting to backend...");
      const result = await approve({
        txId: tx.txId,
        dto: {
          voterCommitment: commitment,
          proof,
          publicInputs,
          nullifier,
        },
      });

      notification.success("Vote submitted!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Approve error:", error);
      notification.error(error.message || "Failed to approve");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  // ============ Handle Deny ============
  const handleDeny = async () => {
    setLoading(true);
    try {
      if (!commitment) {
        notification.error("No commitment found");
        return;
      }

      setLoadingState("Submitting deny vote...");
      await deny({
        txId: tx.txId,
        dto: {
          voterCommitment: commitment,
          totalSigners,
        },
      });

      notification.success("Deny vote submitted!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Deny error:", error);
      notification.error(error.message || "Failed to deny");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleExecute = async (txId: number) => {
    setLoading(true);
    try {
    setLoadingState("Executing on-chain...");
    
    const result = await executeOnChain(txId);
    
    console.log("Transaction executed:", result.txHash);
      onSuccess?.();
    } catch (error: any) {
      console.error("Execute error:", error);
      notification.error(error.message || "Failed to execute");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  // ============ Render Right Side ============
  const renderRightSide = () => {
    if (tx.status === "executed" || tx.status === "failed" || tx.status === "outdated") {
      return <StatusBadge status={tx.status} txHash={tx.txHash} />;
    }

    if (tx.myVoteStatus === null || tx.status === "executing") {
      return (
        <ActionButtons
          onApprove={handleApprove}
          onDeny={handleDeny}
          onExecute={() => handleExecute(tx.txId)}
          loading={loading}
          txStatus={tx.status}
        />
      );
    }

    return <VoteBadge status={tx.myVoteStatus} />;
  };

  return (
    <div className="w-full mb-2">
      {/* Loading State */}
      {loading && loadingState && (
        <div className="mb-1 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">{loadingState}</div>
      )}

      {/* Collapsed Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Nonce right here */}
          {<span className="font-semibold text-gray-600">#{tx.nonce}</span>}
          {expanded ? (
            <ChevronDown size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          ) : (
            <ChevronRight size={24} className="text-gray-600 rounded-[20px] bg-gray-100 p-[3px]" />
          )}
          <span className="font-medium text-[#888888] min-w-[100px]">{getTxTypeLabel(tx.type)}</span>
          <TxDetails tx={tx} />
        </div>
        <div onClick={e => e.stopPropagation()}>{renderRightSide()}</div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-1 mx-2">
          <TxHeader tx={tx} />
          <MemberList
            members={tx.members}
            votedCount={tx.votedCount}
            threshold={tx.threshold}
            totalSigners={totalSigners}
          />
        </div>
      )}
    </div>
  );
}
