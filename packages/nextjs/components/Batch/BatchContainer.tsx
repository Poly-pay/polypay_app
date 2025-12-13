"use client";

import React, { useState } from "react";
import TransactionSummary from "./TransactionSummary";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { formatEther } from "viem";
import { useWalletClient } from "wagmi";
import {
  useBatchItems,
  useCreateTransaction,
  useDeleteBatchItem,
  useMetaMultiSigWallet,
} from "~~/hooks/api";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";
import { BatchItem, TxType } from "@polypay/shared";

// ==================== Custom Checkbox ====================
function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
        checked ? "bg-[#0059ff] border-[#0059ff]" : "bg-white border-gray-300"
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

// ==================== Header Component ====================
function Header({ transactionCount }: { transactionCount: number }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex gap-[5px] items-center justify-start w-full">
        <div className="text-[#545454] text-6xl text-center font-bold uppercase">your</div>
        <div className="h-[50px] relative rounded-full w-[100px] border-[6px] border-[#FF2323] border-solid flex items-center justify-center">
          <span className="text-[#FF2323] text-4xl text-center font-extrabold uppercase leading-none">
            {transactionCount ?? 0}
          </span>
        </div>
        <div className="text-[#545454] text-6xl text-center font-bold uppercase">batch</div>
      </div>
      <div className="flex flex-col leading-none gap-1">
        <span className="text-text-secondary text-[16px]">
          Making bulk transactions will save you time as well as transaction costs.
        </span>
        <span className="text-text-secondary text-[16px]">
          Below is a list of transactions that have been recently added.
        </span>
      </div>
    </div>
  );
}

// ==================== Format Utils ====================
function formatAmount(amount: string): string {
  // Convert wei to ETH if needed, or just format the number
  try {
    const num = formatEther(BigInt(amount));
    return `${num.toLocaleString()} ETH`;
  } catch {
    return amount;
  }
}

function formatRecipient(address: string): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ==================== Batch Transactions Component ====================
function BatchTransactions({
  batchItems,
  selectedItems,
  activeItem,
  onSelectAll,
  onSelectItem,
  onItemClick,
  onRemove,
  isLoading,
  isRemoving,
}: {
  batchItems: BatchItem[];
  selectedItems: Set<string>;
  activeItem: string | null;
  onSelectAll: () => void;
  onSelectItem: (id: string) => void;
  onItemClick: (id: string) => void;
  onRemove: (id: string) => void;
  isLoading?: boolean;
  isRemoving?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-text-secondary">Loading batch items...</div>
      </div>
    );
  }

  if (batchItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-text-secondary text-lg">No draft transactions</div>
        <div className="text-text-secondary text-sm">Add transactions from the Send page to get started</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Select All Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSelectAll}
          className="bg-[#0059ff] flex gap-2 items-center justify-center px-4 py-2 rounded-full cursor-pointer"
        >
          <span className="font-medium text-[14px] text-white tracking-[-0.42px]">Select all</span>
        </button>
        {selectedItems.size > 0 && <span className="text-text-secondary text-sm">{selectedItems.size} selected</span>}
      </div>

      {/* Batch Items List */}
      <div className="grid grid-cols-1 gap-0.5 w-full mt-2">
        {batchItems.map(item => {
          const isActive = activeItem === item.id;
          const isSelected = selectedItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`grid grid-cols-[auto_auto_1fr_auto_1fr_auto] gap-3 items-center p-3 w-full cursor-pointer rounded transition-colors ${
                isActive ? "bg-[#066eff]" : "bg-[#f7f7f7] hover:bg-[#efefef]"
              }`}
              onClick={() => onItemClick(item.id)}
            >
              {/* Checkbox */}
              <div onClick={e => e.stopPropagation()}>
                <CustomCheckbox checked={isSelected} onChange={() => onSelectItem(item.id)} />
              </div>

              {/* Transaction Type */}
              <div className={`text-[16px] tracking-[-0.32px] ${isActive ? "text-white" : "text-[#363636]"}`}>
                Transfer
              </div>

              {/* Amount */}
              <div className={`text-[16px] tracking-[-0.32px] ${isActive ? "text-white" : "text-[#363636]"}`}>
                {formatAmount(item.amount)}
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center w-16">
                <img
                  src="/arrow/thin-long-arrow-right.svg"
                  alt="arrow"
                  className="w-full h-full"
                  style={isActive ? { filter: "invert(1) brightness(1000%)" } : {}}
                />
              </div>

              {/* Recipient */}
              <div className={`text-[16px] tracking-[-0.32px] ${isActive ? "text-white" : "text-[#363636]"}`}>
                To: [{formatRecipient(item.recipient)}]
              </div>

              {/* Remove Button */}
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onRemove(item.id)}
                  disabled={isRemoving}
                  className="bg-gradient-to-b from-[#ff2323] to-[#ed1515] flex items-center justify-center px-5 py-1.5 rounded-[10px] shadow-[0px_2px_4px_-1px_rgba(255,0,4,0.5),0px_0px_0px_1px_#ff6668] cursor-pointer disabled:opacity-50"
                >
                  <span className="font-medium text-[14px] text-center text-white tracking-[-0.42px]">Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Main Container ====================
export default function BatchContainer() {
  const { mutateAsync: deleteBatchItem, isPending: isRemoving } = useDeleteBatchItem();
  const { data: walletClient } = useWalletClient();
  const { secret, commitment: myCommitment } = useIdentityStore();
  const { data: batchItems = [], isLoading } = useBatchItems(myCommitment);
  const { currentWallet } = useWalletStore();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isProposing, setIsProposing] = useState(false);

  // State cho loading message
  const [loadingState, setLoadingState] = useState("");

  // Select all handler
  const handleSelectAll = () => {
    if (selectedItems.size === batchItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(batchItems.map((item: BatchItem) => item.id)));
    }
  };

  // Select single item handler
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Item click handler (for highlighting)
  const handleItemClick = (id: string) => {
    if (activeItem === id) {
      setIsExiting(true);
      setTimeout(() => {
        setActiveItem(null);
        setIsExiting(false);
      }, 300);
    } else {
      setActiveItem(id);
    }
  };

  // Remove item handler
  const handleRemove = async (id: string) => {
    try {
      await deleteBatchItem(id);
      // Remove from selected if it was selected
      const newSelected = new Set(selectedItems);
      newSelected.delete(id);
      setSelectedItems(newSelected);
      // Clear active if it was active
      if (activeItem === id) {
        setActiveItem(null);
      }
    } catch (error) {
      console.error("Failed to remove batch item:", error);
    }
  };

  // Propose batch transaction handler
  const handleProposeBatch = async () => {
    if (selectedItems.size === 0) return;

    // Validate wallet connection
    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    if (!secret || !myCommitment) {
      notification.error("No identity found. Please create identity first.");
      return;
    }

    setIsProposing(true);

    try {
      // 1. Get selected batch items
      const selectedBatchItems = batchItems.filter(item => selectedItems.has(item.id));
      const selectedIds = selectedBatchItems.map(item => item.id);

      // 2. Get current nonce and threshold
      setLoadingState("Preparing batch transaction...");
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const commitments = await metaMultiSigWallet.read.getCommitments();

      // 3. Encode batchTransfer call data
      const recipients = selectedBatchItems.map(item => item.recipient as `0x${string}`);
      const amounts = selectedBatchItems.map(item => BigInt(item.amount));

      // Encode function call: batchTransfer(address[], uint256[])
      const { encodeFunctionData } = await import("viem");
      const batchTransferData = encodeFunctionData({
        abi: [
          {
            name: "batchTransfer",
            type: "function",
            inputs: [
              { name: "recipients", type: "address[]" },
              { name: "amounts", type: "uint256[]" },
            ],
            outputs: [],
          },
        ],
        functionName: "batchTransfer",
        args: [recipients, amounts],
      });

      // 4. Calculate txHash (to = wallet itself, value = totalValue, data = batchTransfer call)
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        metaMultiSigWallet.address, // to = self
        0n, // value = 0 for batch, actual value is sum of amounts in data
        batchTransferData,
      ])) as `0x${string}`;

      // 5. Sign txHash
      setLoadingState("Please sign the transaction...");
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // 6. Calculate values for ZK proof
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64);
      const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
      const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

      // 7. Get merkle data
      const tree = await buildMerkleTree(commitments ?? []);
      const merkleRoot = await metaMultiSigWallet.read.merkleRoot();

      const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(myCommitment));
      if (leafIndex === -1) {
        notification.error("You are not a signer of this wallet");
        setIsProposing(false);
        return;
      }

      const merklePath = getMerklePath(tree, leafIndex);

      // 8. Generate ZK proof
      setLoadingState("Generating ZK proof...");
      const input = {
        signature: sigBytes,
        pub_key_x: pubKeyX,
        pub_key_y: pubKeyY,
        secret: secret,
        leaf_index: leafIndex,
        merkle_path: merklePath.map(p => p.toString()),
        tx_hash_bytes: txHashBytes,
        tx_hash_commitment: txHashCommitment.toString(),
        merkle_root: merkleRoot?.toString() ?? "",
        nullifier: nullifier.toString(),
      };

      const circuit_json = await fetch("/circuit/target/circuit.json");
      const noir_data = await circuit_json.json();
      const { bytecode, abi } = noir_data;

      const noir = new Noir({ bytecode, abi } as any);
      const execResult = await noir.execute(input);

      const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
      const { proof, publicInputs } = await plonk.generateProof(execResult.witness);

      // 9. Submit to backend
      setLoadingState("Submitting to backend...");
      const result = await createTransaction({
        nonce: Number(currentNonce),
        type: TxType.BATCH,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: commitments?.length || 0,
        // For BATCH: to = wallet, value = 0
        to: metaMultiSigWallet.address,
        value: '0',
        creatorCommitment: myCommitment,
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        // Batch specific
        batchItemIds: selectedIds,
      });

      if (result) {
        notification.success("Batch transaction created! Waiting for approvals.");
        // Clear selection after successful proposal
        setSelectedItems(new Set());
      }
    } catch (error: any) {
      console.error("Propose batch error:", error);
      notification.error(error.message || "Failed to propose batch");
    } finally {
      setIsProposing(false);
      setLoadingState("");
    }
  };

  // Get selected batch items for summary
  const selectedBatchItems = batchItems.filter((item: BatchItem) => selectedItems.has(item.id));

  return (
    <div className="flex flex-row gap-1 w-full h-full bg-app-background">
      {/* Main Content */}
      <div className="flex flex-col gap-5 p-3 bg-background rounded-lg flex-1 border border-divider">
        {/* Shopping Bag Icon */}
        <div className="flex flex-row h-[100px] w-full justify-between">
          <div className="w-full relative">
            {/* <img src="/misc/shopping-bag.svg" alt="batch" className="w-[150px]" /> */}
            <div className="absolute -bottom-5 left-0 right-0 h-30 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Header */}
        <Header transactionCount={batchItems.length} />

        {/* Batch Items List */}
        <BatchTransactions
          batchItems={batchItems}
          selectedItems={selectedItems}
          activeItem={activeItem}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          onItemClick={handleItemClick}
          onRemove={handleRemove}
          isLoading={isLoading}
          isRemoving={isRemoving}
        />
      </div>

      {/* Transaction Summary Sidebar */}
      {selectedItems.size > 0 && (
        <div className={`overflow-hidden ${isExiting ? "animate-slide-out" : "animate-slide-in"}`}>
          <TransactionSummary
            className="w-[400px]"
            transactions={selectedBatchItems.map(item => ({
              id: item.id,
              amount: formatAmount(item.amount),
              recipient: formatRecipient(item.recipient),
            }))}
            onConfirm={handleProposeBatch}
            isLoading={isProposing}
            loadingState={loadingState}
          />
        </div>
      )}
    </div>
  );
}
