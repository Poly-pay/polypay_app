"use client";

import React, { useState } from "react";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { useCreateTransaction } from "~~/hooks/api/useTransaction";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

export default function SendContainer() {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const { data: walletClient } = useWalletClient();
  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
    walletClient,
  });
  const { mutateAsync: createTransaction } = useCreateTransaction();

  const handleTransfer = async () => {
    // Validate inputs
    if (!amount || !address) {
      notification.error("Please enter amount and address");
      return;
    }

    if (!walletClient || !metaMultiSigWallet) {
      notification.error("Wallet not connected");
      return;
    }

    // Validate address format
    if (!address.startsWith("0x") || address.length !== 42) {
      notification.error("Invalid address format");
      return;
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      notification.error("Invalid amount");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get current nonce and threshold
      setLoadingState("Preparing transaction...");
      const currentNonce = await metaMultiSigWallet.read.nonce();
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const valueInWei = parseEther(amount);

      // 2. Calculate txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        currentNonce,
        address as `0x${string}`,
        valueInWei,
        "0x" as `0x${string}`,
      ])) as `0x${string}`;

      // 3. Sign txHash
      setLoadingState("Please sign the transaction...");
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // 4. Get secret from localStorage
      const secret = localStorage.getItem("secret");
      if (!secret) {
        notification.error("No secret found. Please create identity first.");
        setIsLoading(false);
        return;
      }

      // 5. Calculate values
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64);
      const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
      const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

      // 6. Get merkle data
      const commitments = await metaMultiSigWallet.read.getCommitments();
      const tree = await buildMerkleTree(commitments ?? []);
      const merkleRoot = await metaMultiSigWallet.read.merkleRoot();

      const myCommitment = localStorage.getItem("commitment");
      if (!myCommitment) {
        notification.error("No commitment found. Please create identity first.");
        setIsLoading(false);
        return;
      }

      const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(myCommitment));

      if (leafIndex === -1) {
        notification.error("You are not a signer of this wallet");
        setIsLoading(false);
        return;
      }

      const merklePath = getMerklePath(tree, leafIndex);

      // 7. Generate ZK proof
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

      // 8. Submit to backend
      setLoadingState("Submitting to backend...");
      const result = await createTransaction({
        nonce: Number(currentNonce),
        type: "TRANSFER",
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        to: address,
        value: valueInWei.toString(),
        creatorCommitment: myCommitment,
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
      });

      if (result) {
        notification.success("Transfer transaction created! Waiting for approvals.");
      }

      // Reset form
      setAmount("");
      setAddress("");
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error(error.message || "Failed to create transfer");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const executeOnChain = async (txId: number) => {
    if (!metaMultiSigWallet) return;

    // Fetch execution data from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${txId}/execute`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get execution data");
    }

    const executionData = await response.json();

    // Format proofs for contract
    const zkProofs = executionData.zkProofs.map((p: any) => ({
      nullifier: BigInt(p.nullifier),
      aggregationId: BigInt(p.aggregationId),
      domainId: BigInt(p.domainId),
      zkMerklePath: p.zkMerklePath as `0x${string}`[],
      leafCount: BigInt(p.leafCount),
      index: BigInt(p.index),
    }));

    // Call contract
    const txHash = await metaMultiSigWallet.write.execute([
      executionData.to as `0x${string}`,
      BigInt(executionData.value),
      executionData.data as `0x${string}`,
      zkProofs,
    ]);

    // Mark as executed in backend
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${txId}/executed`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });

    return txHash;
  };

  return (
    <div className="overflow-hidden relative w-full h-full flex flex-col rounded-lg">
      {/* Background images */}
      <div className="absolute -top-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <img src="/transfer/top-globe.svg" alt="Top globe" className="w-full h-full" />
      </div>
      <div className="absolute -bottom-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <img src="/transfer/bottom-globe.svg" alt="Bottom globe" className="w-full h-full" />
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4">
        {/* Title section */}
        <div className="flex flex-col items-center justify-center pt-8">
          <div className="text-[#545454] text-6xl text-center font-bold uppercase w-full">transfering</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-[#545454] text-6xl text-center font-bold uppercase">t</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-[#545454] text-6xl text-center font-bold uppercase">friends</div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && loadingState && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{loadingState}</div>
        )}

        {/* Token selector and amount */}
        <div className="flex gap-1 items-center justify-center w-full max-w-md">
          {/* Token selector */}
          <div className="bg-white flex gap-1 items-center justify-start pl-1.5 pr-0.5 py-0.5 rounded-full border border-[#e0e0e0] cursor-pointer">
            <img src="/token/eth.svg" alt="Ethereum" className="w-9 h-9" />
          </div>

          {/* Amount input */}
          <input
            type="text"
            value={amount}
            placeholder="0.00"
            onChange={e => {
              // Only allow numbers and decimal point
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setAmount(value);
              }
            }}
            className="text-text-primary text-[44px] uppercase outline-none w-[150px]"
            disabled={isLoading}
          />
          <span className="text-[#545454] text-2xl font-medium">ETH</span>
        </div>

        {/* Visual divider */}
        <div className="flex flex-col gap-2.5 items-center justify-center w-full max-w-md h-[100px] relative">
          <div className="h-[75.46px] w-full max-w-[528px] flex items-center justify-center relative">
            <div className="relative w-full h-full">
              <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
            </div>
            <div className="absolute bg-[#fff] rounded-[32.842px] w-8 h-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-[1px] border-dashed border-[#FF7CEB] shadow-[0_0_20px_rgba(255,124,235,0.5)]">
              <div className="text-text-secondary text-[14px] text-center text-[#676767]">To</div>
            </div>
          </div>
        </div>

        {/* Address input */}
        <div className="flex flex-col gap-[5px] items-center justify-start w-full max-w-xl">
          <div className="flex gap-2.5 items-center justify-center w-full">
            <div className="bg-white grow min-h-px min-w-px relative rounded-[16px] border border-[#e0e0e0] shadow-[0px_0px_10.3px_0px_rgba(135,151,255,0.14),0px_0px_89.5px_0px_rgba(0,0,0,0.05)] p-3 justify-between flex-row flex">
              <input
                type="text"
                placeholder="Enter recipient address (0x...)"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="text-text-secondary text-[16px] outline-none placeholder:text-text-secondary flex-1 w-full"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs">
          <button
            onClick={handleTransfer}
            disabled={isLoading || !amount || !address}
            className="bg-[#FF7CEB] flex items-center justify-center px-5 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1 hover:bg-[#f35ddd] transition-colors"
          >
            <span className="font-semibold text-[16px] text-center text-white tracking-[-0.16px]">
              {isLoading ? "Processing..." : "Transfer now"}
            </span>
          </button>
        </div>

        {/* Info text */}
        <p className="text-sm text-gray-500 text-center max-w-md">
          This will create a transfer proposal that requires <span className="font-medium">threshold</span> approvals
          from signers.
        </p>
      </div>
    </div>
  );
}
