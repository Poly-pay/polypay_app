"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { TokenPillPopover } from "./TokenPillPopover";
import { BatchItem, NATIVE_ETH, Token, getTokenByAddress } from "@polypay/shared";
import { formatEther, formatUnits } from "viem";
import { ContactPicker } from "~~/components/contact-book/ContactPicker";
import { useContacts } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { editBatchSchema } from "~~/lib/form";
import { useAccountStore } from "~~/services/store";
import { formatAddress } from "~~/utils/format";

interface EditBatchPopoverProps {
  item: BatchItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { recipient: string; amount: string; token: Token; contactId?: string }) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export default function EditBatchPopover({ item, isOpen, onClose, onSave, triggerRef }: EditBatchPopoverProps) {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const popoverRef = useRef<HTMLDivElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentAccount: selectedAccount } = useAccountStore();
  const { data: contacts = [] } = useContacts(selectedAccount?.id || null);

  const formatAmountFromWei = (amount: string, tokenAddress: string) => {
    try {
      const token = getTokenByAddress(tokenAddress);
      if (token.address === NATIVE_ETH.address) {
        return formatEther(BigInt(amount));
      }
      return formatUnits(BigInt(amount), token.decimals);
    } catch {
      return "0";
    }
  };

  const form = useZodForm({
    schema: editBatchSchema,
    defaultValues: {
      recipient: item.recipient,
      amount: formatAmountFromWei(item.amount || "0", item.tokenAddress || NATIVE_ETH.address),
      tokenAddress: item.tokenAddress || NATIVE_ETH.address,
      contactId: item.contact?.id || undefined,
      contactName: item.contact?.name || undefined,
    },
  });

  useEffect(() => {
    if (isOpen && triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();

      const left = triggerRect.left - popoverRect.width - 20;
      const top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  const handleContactSelect = (selectedAddress: string, name: string, contactId: string) => {
    form.setValue("recipient", selectedAddress, { shouldValidate: true });
    form.setValue("contactId", contactId);
    form.setValue("contactName", name);
  };

  const handleRecipientChange = (value: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    form.setValue("recipient", value, { shouldValidate: false });

    validationTimeoutRef.current = setTimeout(() => {
      form.trigger("recipient");
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const watchedAmount = form.watch("amount");
  const isAmountValid = watchedAmount !== "" && parseFloat(watchedAmount) > 0;
  const watchedTokenAddress = form.watch("tokenAddress");
  const watchedContactName = form.watch("contactName");
  const watchedRecipient = form.watch("recipient");
  const selectedToken = getTokenByAddress(watchedTokenAddress || NATIVE_ETH.address);

  const matchedContact = useMemo(() => {
    if (!watchedRecipient) return null;
    return contacts.find(contact => contact.address.toLowerCase() === watchedRecipient.toLowerCase());
  }, [contacts, watchedRecipient]);

  const shouldShowBadge = !!matchedContact;

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();
    const token = getTokenByAddress(data.tokenAddress || NATIVE_ETH.address);

    onSave({
      recipient: data.recipient,
      amount: data.amount,
      token: token,
      contactId: data.contactId || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white rounded-2xl shadow-lg border border-grey-100 p-4"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "315px",
        maxWidth: "315px",
      }}
    >
      <Image
        src="/icons/arrows/popover-arrow.svg"
        alt="arrow"
        width={32}
        height={32}
        className="absolute -right-7"
        style={{
          top: triggerRef.current
            ? `${triggerRef.current.getBoundingClientRect().top + 4 - position.top + triggerRef.current.getBoundingClientRect().height / 2}px`
            : "50%",
          transform: "translateY(-50%)",
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center justify-center pt-5 w-full">
            <TokenPillPopover
              selectedToken={selectedToken}
              onSelect={(tokenAddress: string) => form.setValue("tokenAddress", tokenAddress)}
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
              className="text-grey-950 text-3xl outline-none font-medium rounded-lg px-3 py-2 max-w-[200px]"
            />
          </div>

          {form.formState.errors.amount && (
            <p className="text-red-500 text-xs">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 items-center justify-center w-full max-w-md h-[100px] relative">
          <div className="h-[75.46px] w-full max-w-[528px] flex items-center justify-center relative">
            <div className="relative w-full h-full">
              <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
            </div>
            <div className="absolute bg-white rounded-[32.842px] w-8 h-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-[1px] border-dashed border-pink-350 shadow-[0_0_20px_rgba(255,124,235,0.5)]">
              <div className="text-text-secondary text-[14px] text-center text-grey-800">To</div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <div className="bg-white w-full flex-1 rounded-2xl border border-grey-100 p-2 flex gap-2 items-center focus-within:border-[#FF7CEB] transition-colors">
              <input
                {...form.register("recipient")}
                type="text"
                placeholder="Enter recipient address (0x...)"
                onChange={e => {
                  handleRecipientChange(e.target.value);
                }}
                className="text-sm outline-none py-1 placeholder:text-grey-400 flex-1 w-full truncate overflow-hidden"
              />
              {shouldShowBadge && (
                <div
                  className={`flex bg-grey-100 items-center gap-1 text-xs font-medium rounded-full w-fit pl-1 pr-4 py-1 max-w-20`}
                >
                  <Image
                    src={"/avatars/default-avt.svg"}
                    alt="avatar"
                    width={16}
                    height={16}
                    className="flex-shrink-0"
                  />
                  <span className="truncate overflow-hidden">
                    {watchedContactName ? (
                      <>
                        <span className="font-medium mr-0.5">{watchedContactName}</span>
                        <span>{"(" + `${formatAddress(watchedRecipient, { start: 3, end: 3 })}` + ")"}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium mr-0.5">{matchedContact?.name}</span>
                        <span>{"(" + `${formatAddress(watchedRecipient, { start: 3, end: 3 })}` + ")"}</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
            <ContactPicker accountId={selectedAccount?.id || null} onSelect={handleContactSelect} disabled={false} />
          </div>

          {form.formState.errors.recipient && (
            <span className="text-red-500 text-xs">{form.formState.errors.recipient.message}</span>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="max-w-[90px] flex-1 bg-grey-100 font-medium text-sm py-2 rounded-lg hover:bg-grey-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              !isAmountValid || !watchedRecipient || !!form.formState.errors.recipient || !!form.formState.errors.amount
            }
            className="flex-1 bg-main-pink font-medium text-sm py-2 rounded-lg hover:bg-main-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
