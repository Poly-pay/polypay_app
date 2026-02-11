"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ResolvedToken, parseTokenAmount } from "@polypay/shared";
import { parseEther } from "viem";
import { ContactPicker } from "~~/components/contact-book/ContactPicker";
import { TokenPillPopover } from "~~/components/popovers/TokenPillPopover";
import { useMetaMultiSigWallet, useTransferTransaction } from "~~/hooks";
import { useCreateBatchItem } from "~~/hooks/api";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";
import { useZodForm } from "~~/hooks/form";
import { TransferFormData, transferSchema } from "~~/lib/form";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

export default function TransferContainer() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { tokens, nativeEth } = useNetworkTokens();
  const [selectedToken, setSelectedToken] = useState<ResolvedToken>(nativeEth);

  const { currentAccount: selectedAccount } = useAccountStore();
  const { mutateAsync: createBatchItem } = useCreateBatchItem();
  const { commitment } = useIdentityStore();

  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { balances, isLoading: isLoadingBalances } = useTokenBalances(metaMultiSigWallet?.address);
  const currentBalance = balances[selectedToken.address] || "0";

  const form = useZodForm({
    schema: transferSchema,
    defaultValues: {
      recipient: "",
      amount: "",
    },
  });

  const handleMaxClick = () => {
    form.setValue("amount", currentBalance, { shouldValidate: true });
  };

  useEffect(() => {
    // Check for recipient data from sessionStorage
    const recipientData = sessionStorage.getItem("transferRecipient");
    if (recipientData) {
      try {
        const { address, name, contactId } = JSON.parse(recipientData);
        form.setValue("recipient", address, { shouldValidate: true });
        if (contactId) {
          setSelectedContactId(contactId);
        }
        if (name) {
          notification.info(`Pre-filled address for: ${name}`);
        }
        // Clear the data after using it
        sessionStorage.removeItem("transferRecipient");
      } catch (error) {
        console.error("Failed to parse recipient data:", error);
      }
    }
  }, [form]);

  const { transfer, isLoading, loadingState } = useTransferTransaction({
    onSuccess: () => {
      form.reset();
      setSelectedContactId(null);
    },
  });

  const isNativeETH = selectedToken.address === nativeEth.address;

  const handleTransfer = async (data: TransferFormData) => {
    await transfer({
      recipient: data.recipient,
      amount: data.amount,
      token: selectedToken,
      contactId: selectedContactId,
    });
  };

  const handleAddToBatch = async () => {
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    const data = form.getValues();

    // Validate commitment
    if (!commitment) {
      notification.error("No commitment found. Please create identity first.");
      return;
    }

    try {
      const valueInSmallestUnit = isNativeETH
        ? parseEther(data.amount).toString()
        : parseTokenAmount(data.amount, selectedToken.decimals);

      await createBatchItem({
        recipient: data.recipient,
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
      form.reset();
      setSelectedContactId(null);
    } catch (error: any) {
      console.error("Add to batch error:", error);
      notification.error(error.message || "Failed to add to batch");
    }
  };

  const handleContactSelect = (selectedAddress: string, name: string, contactId: string) => {
    form.setValue("recipient", selectedAddress, { shouldValidate: true });
    setSelectedContactId(contactId);
    notification.info(`Selected: ${name}`);
  };

  const watchedRecipient = form.watch("recipient");
  const watchedAmount = form.watch("amount");
  const isAmountValid = watchedAmount !== "" && parseFloat(watchedAmount) > 0;

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
      <div className="flex flex-col gap-6 items-center justify-center flex-1 px-4">
        {/* Title section */}
        <div className="flex flex-col items-center justify-center pt-8 relative z-50">
          <div className="text-6xl text-center font-bold uppercase w-full">transfering</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-6xl text-center font-bold uppercase">t</div>
            <div className="xl:h-11 h-6 relative rounded-full xl:w-32 w-16 border-[4.648px] border-primary border-solid"></div>
            <div className="text-6xl text-center font-bold uppercase">anyone</div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && loadingState && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{loadingState}</div>
        )}

        <div className="flex flex-col gap-2 mt-20">
          <div className="flex gap-2 items-center justify-center w-full">
            <TokenPillPopover
              selectedToken={selectedToken}
              onSelect={(tokenAddress: string) => {
                const token = tokens.find(t => t.address === tokenAddress);
                if (token) {
                  setSelectedToken(token);
                  form.setValue("amount", "0");
                }
              }}
            />

            <input
              {...form.register("amount")}
              type="text"
              placeholder="0.00"
              onChange={e => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  form.setValue("amount", value, { shouldValidate: true });
                }
              }}
              className="text-text-primary text-[44px] uppercase outline-none w-[150px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-3 text-grey-500 text-base">
            <span>Polypay account balance:</span>
            <span className="font-semibold text-grey-700">
              {isLoadingBalances ? "..." : currentBalance} {selectedToken.symbol}
            </span>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isLoading || isLoadingBalances}
              className="bg-blue-500 text-white rounded-lg px-3 py-1 font-medium text-sm disabled:opacity-50 cursor-pointer"
            >
              Max
            </button>
          </div>

          {form.formState.errors.amount && (
            <p className="text-red-500 text-xs">{form.formState.errors.amount.message}</p>
          )}
        </div>
        {/* Visual divider */}
        <div className="flex flex-col gap-2.5 items-center justify-center w-full max-w-md h-[100px] relative">
          <div className="h-[75.46px] w-full max-w-[528px] flex items-center justify-center relative">
            <div className="relative w-full h-full">
              <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
            </div>
            <div className="absolute bg-white rounded-[32.842px] w-8 h-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-1 border-dashed shadow-[0 4px 33.5px 0 rgba(26, 32, 111, 0.29)]">
              <div className="text-text-secondary text-[14px] text-center text-grey-800">To</div>
            </div>
          </div>
        </div>
        {/* Address input */}
        <div className="flex flex-col gap-[5px] items-center justify-start w-full max-w-xl">
          <div className="flex gap-2.5 items-center justify-center w-full">
            <div className="bg-grey-50 grow min-h-px min-w-px relative rounded-2xl border border-grey-200 p-4 justify-between flex-row flex">
              <input
                {...form.register("recipient")}
                type="text"
                placeholder="Enter address"
                className="text-text-secondary outline-none placeholder:text-text-secondary flex-1 w-full font-medium"
                disabled={isLoading}
              />
            </div>
            <ContactPicker
              accountId={selectedAccount?.id || null}
              onSelect={handleContactSelect}
              disabled={isLoading}
            />
          </div>
          {form.formState.errors.recipient && (
            <p className="text-red-500 text-sm">{form.formState.errors.recipient.message}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs">
          <button
            onClick={handleAddToBatch}
            disabled={isLoading || !isAmountValid || !watchedRecipient}
            className="bg-main-black flex items-center justify-center px-3 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1 transition-colors"
          >
            <span className="font-medium xl:text-base text-xs text-center text-white tracking-[-0.16px]">
              {isLoading ? "Processing..." : "Add to batch"}
            </span>
          </button>
          <button
            onClick={form.handleSubmit(handleTransfer)}
            disabled={isLoading || !isAmountValid || !watchedRecipient}
            className="bg-pink-350 flex items-center justify-center px-3 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1 hover:bg-pink-450 transition-colors"
          >
            <span className="font-medium xl:text-base text-xs text-center tracking-[-0.16px]">
              {isLoading ? "Processing..." : "Transfer now"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
