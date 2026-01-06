"use client";

import React, { useState } from "react";
import Image from "next/image";
import { TxType, encodeERC20Transfer } from "@polypay/shared";
import { parseEther } from "viem";
import { useWalletClient } from "wagmi";
import { ContactPicker } from "~~/components/address-book/ContactPicker";
import { NATIVE_ETH, SUPPORTED_TOKENS, Token, parseTokenAmount } from "~~/constants";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useCreateBatchItem } from "~~/hooks/api";
import { useCreateTransaction, useReserveNonce } from "~~/hooks/api/useTransaction";
import { useGenerateProof } from "~~/hooks/app/useGenerateProof";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

export default function TransferContainer() {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");

  const [selectedToken, setSelectedToken] = useState<Token>(NATIVE_ETH);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

  const { currentWallet: selectedWallet } = useWalletStore();

  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: reserveNonce } = useReserveNonce();
  const { mutateAsync: createBatchItem } = useCreateBatchItem();
  const { commitment } = useIdentityStore();
  const { generateProof } = useGenerateProof({
    onLoadingStateChange: setLoadingState,
  });

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
      // 1. Reserve nonce from backend
      const { nonce } = await reserveNonce(metaMultiSigWallet.address);

      // 2. Get current threshold and commitments
      setLoadingState("Preparing transaction...");
      const currentThreshold = await metaMultiSigWallet.read.signaturesRequired();
      const valueInSmallestUnit = isNativeETH
        ? parseEther(amount).toString()
        : parseTokenAmount(amount, selectedToken.decimals);
      const commitments = await metaMultiSigWallet.read.getCommitments();

      // 3. Calculate txHash (different for ETH vs ERC20)
      let txHash: `0x${string}`;

      if (isNativeETH) {
        // ETH: to = recipient, value = amount, data = 0x
        txHash = (await metaMultiSigWallet.read.getTransactionHash([
          BigInt(nonce),
          address as `0x${string}`,
          BigInt(valueInSmallestUnit),
          "0x" as `0x${string}`,
        ])) as `0x${string}`;
      } else {
        // ERC20: to = tokenAddress, value = 0, data = transfer(recipient, amount)
        const encodedData = encodeERC20Transfer(address, BigInt(valueInSmallestUnit));
        txHash = (await metaMultiSigWallet.read.getTransactionHash([
          BigInt(nonce),
          selectedToken.address as `0x${string}`,
          0n,
          encodedData as `0x${string}`,
        ])) as `0x${string}`;
      }

      // 4. Generate proof
      const { proof, publicInputs, nullifier } = await generateProof(txHash);

      // 5. Submit to backend
      setLoadingState("Submitting to backend...");
      const result = await createTransaction({
        nonce,
        type: TxType.TRANSFER,
        walletAddress: metaMultiSigWallet.address,
        threshold: Number(currentThreshold),
        totalSigners: commitments?.length || 0,
        to: address,
        value: valueInSmallestUnit,
        tokenAddress: isNativeETH ? undefined : selectedToken.address,
        contactId: selectedContactId || undefined,
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
      setSelectedContactId(null);
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error(error.message || "Failed to create transfer");
    } finally {
      setIsLoading(false);
      setLoadingState("");
    }
  };

  const handleAddToBatch = async () => {
    // Validate inputs
    if (!amount || !address) {
      notification.error("Please enter amount and address");
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

    // Validate commitment
    if (!commitment) {
      notification.error("No commitment found. Please create identity first.");
      return;
    }

    try {
      const valueInSmallestUnit = isNativeETH
        ? parseEther(amount).toString()
        : parseTokenAmount(amount, selectedToken.decimals);

      await createBatchItem({
        recipient: address,
        amount: valueInSmallestUnit,
        tokenAddress: isNativeETH ? undefined : selectedToken.address,
        contactId: selectedContactId || undefined,
      });

      notification.success(
        <div className="flex flex-col gap-1">
          <span>Added to batch!</span>
          <a href="/batch" className="text-primary underline text-sm">
            View your batch →
          </a>
        </div>,
      );

      // Reset form
      setAmount("");
      setAddress("");
      setSelectedContactId(null);
    } catch (error: any) {
      console.error("Add to batch error:", error);
      notification.error(error.message || "Failed to add to batch");
    }
  };

  const handleContactSelect = (selectedAddress: string, name: string, contactId: string) => {
    setAddress(selectedAddress);
    setSelectedContactId(contactId);
    notification.info(`Selected: ${name}`);
  };

  const isNativeETH = selectedToken.address === NATIVE_ETH.address;

  return (
    <div className="overflow-hidden relative w-full h-full flex flex-col rounded-lg">
      {/* Background images */}
      <div className="absolute -top-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <Image src="/transfer/top-globe.svg" alt="Top globe" className="w-full h-full" width={780} height={736} />
      </div>
      <div className="absolute -bottom-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <Image src="/transfer/bottom-globe.svg" alt="Bottom globe" className="w-full h-full" width={780} height={736} />
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4">
        {/* Title section */}
        <div className="flex flex-col items-center justify-center pt-8 relative z-50">
          <div className="text-[#545454] xl:text-6xl text=3xl text-center font-bold uppercase w-full">transfering</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-[#545454] xl:text-6xl text=3xl text-center font-bold uppercase">t</div>
            <div className="xl:h-[48px] h-6 relative rounded-full xl:w-[125.07px] w-16 border-[4.648px] border-primary border-solid"></div>
            <div className="text-[#545454] xl:text-6xl text=3xl text-center font-bold uppercase">anyone</div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && loadingState && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{loadingState}</div>
        )}

        {/* Token selector and amount */}
        <div className="flex gap-1 items-center justify-center w-full max-w-md">
          {/* Token selector */}
          <div className="relative mr-2">
            <div
              onClick={() => setShowTokenDropdown(!showTokenDropdown)}
              className="bg-white flex gap-1 items-center justify-start pl-1.5 pr-2 py-1 rounded-full border border-[#e0e0e0] cursor-pointer hover:border-[#FF7CEB] transition-colors"
            >
              <Image
                src={selectedToken.icon}
                alt={selectedToken.symbol}
                width={36}
                height={36}
                className="xl:h-9 xl:w-9 w-4 h-4"
              />
              <span className="xl:text-sm text-xs font-medium text-gray-700">{selectedToken.symbol}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {showTokenDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#e0e0e0] shadow-lg z-10 min-w-[140px]">
                {SUPPORTED_TOKENS.map(token => (
                  <div
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenDropdown(false);
                    }}
                    className="flex items-center xl:gap-2 gap-1 px-3 py-2 hover:bg-gray-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                  >
                    <Image
                      src={token.icon}
                      alt={token.symbol}
                      width={24}
                      height={24}
                      className="xl:w-6 xl:h-6 w-3 h-3"
                    />
                    <span className="xl:text-sm text-xs font-medium text-gray-700">{token.symbol}</span>
                  </div>
                ))}
              </div>
            )}
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
            className="text-text-primary xl:text-[44px] text-sm uppercase outline-none w-[150px]"
            disabled={isLoading}
          />
          <span className="text-[#545454] xl:text-2xl text-sm font-medium">{selectedToken.symbol}</span>
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
                className="text-text-secondary xl:text-base text-xs outline-none placeholder:text-text-secondary flex-1 w-full"
                disabled={isLoading}
              />
              <ContactPicker
                walletId={selectedWallet?.id || null}
                onSelect={handleContactSelect}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs">
          <button
            onClick={handleAddToBatch}
            disabled={isLoading || !amount || !address}
            className="bg-[#FF7CEB] flex items-center justify-center px-5 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1 hover:bg-[#f35ddd] transition-colors"
          >
            <span className="font-semibold xl:text-base text-xs text-center text-white tracking-[-0.16px]">
              {isLoading ? "Processing..." : "Add to batch"}
            </span>
          </button>
          <button
            onClick={handleTransfer}
            disabled={isLoading || !amount || !address}
            className="bg-[#FF7CEB] flex items-center justify-center px-5 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1 hover:bg-[#f35ddd] transition-colors"
          >
            <span className="font-semibold xl:text-base text-xs text-center text-white tracking-[-0.16px]">
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
