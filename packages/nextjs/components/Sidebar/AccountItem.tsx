"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Account, AccountSigner, SUPPORTED_TOKENS } from "@polypay/shared";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~~/components/ui/tooltip";
import { useModalApp } from "~~/hooks";
import { useUpdateAccount } from "~~/hooks/api/useAccount";
import { useTokenPrices } from "~~/hooks/api/usePrice";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";
import { useAccountStore } from "~~/services/store";
import { getAvatarByAccountId } from "~~/utils/avatar";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";

interface AccountItemProps {
  account: Account;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (accountId: string) => void;
  onToggleExpand: (accountId: string) => void;
}

export default function AccountItem({ account, isSelected, isExpanded, onSelect, onToggleExpand }: AccountItemProps) {
  const avatarSrc = getAvatarByAccountId(account.id);
  const { mutate: updateAccount } = useUpdateAccount();
  const { setCurrentAccount, currentAccount } = useAccountStore();
  const { openModal } = useModalApp();

  // Inline edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(account.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Balance state
  const [showBalance, setShowBalance] = useState(true);
  const { balances, isLoading: isLoadingBalances } = useTokenBalances(account.address);
  const { getPriceBySymbol, isLoading: isLoadingPrices } = useTokenPrices();

  const isLoading = isLoadingBalances || isLoadingPrices;

  // Calculate total USD value
  const totalUsdValue = React.useMemo(() => {
    return SUPPORTED_TOKENS.reduce((sum, token) => {
      const balance = balances[token.address] || "0";
      const price = getPriceBySymbol(token.symbol);
      return sum + parseFloat(balance) * price;
    }, 0);
  }, [balances, getPriceBySymbol]);

  const formattedTotalUsd = totalUsdValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const handleRadioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(account.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== account.name) {
      updateAccount(
        { address: account.address, dto: { name: trimmedName } },
        {
          onError: () => {
            // Revert if error occurs
            setEditedName(account.name);
          },
        },
      );
      // Update store
      setCurrentAccount({ ...currentAccount, name: trimmedName } as any);
    } else {
      // No changes, revert to original name
      setEditedName(account.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(account.name);
      setIsEditingName(false);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(account.id);
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Reset edited name when account changes
  useEffect(() => {
    if (!isEditingName) {
      setEditedName(account.name);
    }
  }, [account.name, isEditingName]);

  return (
    <div
      className={`
        box-border flex flex-col p-2 rounded-lg cursor-pointer transition-all duration-200
        ${isExpanded ? "gap-4" : "h-[58px] border-b border-grey-200"}
          ${isSelected ? (isExpanded ? "bg-violet-100" : "bg-pink-25") : "bg-grey-50 hover:bg-grey-100"}
      `}
      onClick={handleToggleClick}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between h-[42px]">
        {/* Left Section */}
        <div className="flex items-center gap-5">
          {/* Radio Button */}
          <div
            className={`
              w-3.5 h-3.5 rounded-full cursor-pointer
              ${
                isSelected
                  ? "bg-main-pink border border-main-white shadow-[0px_0px_4px_rgba(64,140,255,0.25)]"
                  : "bg-grey-200 border border-grey-400"
              }
            `}
            onClick={handleRadioClick}
          />

          {/* Avatar + Info */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 bg-main-white rounded-full overflow-hidden flex items-center justify-center">
              <Image src={avatarSrc} alt={account.name} width={40} height={40} className="object-cover" />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center gap-1">
              {/* Name + Edit */}
              <div className="flex items-center gap-1">
                {isEditingName ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={handleNameKeyDown}
                    onClick={e => e.stopPropagation()}
                    className="text-[15px] font-medium text-grey-950 tracking-[-0.03em] bg-transparent border-b border-main-pink outline-none w-[100px]"
                  />
                ) : (
                  <span className="text-[15px] font-medium text-grey-950 tracking-[-0.03em]">{account.name}</span>
                )}
                {isSelected && (
                  <Image
                    src="/icons/actions/edit-pink.svg"
                    alt="Edit"
                    width={16}
                    height={16}
                    className={`cursor-pointer ${isSelected || isExpanded ? "opacity-100" : "opacity-50"}`}
                    onClick={handleEditClick}
                  />
                )}
              </div>

              {/* Address Badge */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-fit flex items-center justify-center px-1.5 h-[18px] bg-blue-600 hover:bg-blue-550 rounded-full cursor-pointer transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      copyToClipboard(account.address, "Address copied to clipboard");
                    }}
                  >
                    <span className="text-xs font-medium text-main-white tracking-[-0.02em] leading-none">
                      {formatAddress(account.address, { start: 4, end: 4 })}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#444444] text-white text-xs px-4 py-1.5 rounded-md border-0">
                  <p>Click to copy</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Right Section - Arrow */}
        <div className="p-1 cursor-pointer">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-grey-950" />
          ) : (
            <ChevronDown className="w-4 h-4 text-grey-950" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Balance Section */}
          <div className="flex items-center justify-between px-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-grey-1000 tracking-[-0.04em]">Balance</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setShowBalance(!showBalance);
                  }}
                  className="cursor-pointer"
                >
                  {showBalance ? (
                    <Eye className="w-[16px] h-[16px] opacity-40" />
                  ) : (
                    <EyeOff className="w-[16px] h-[16px] opacity-40s" />
                  )}
                </button>
              </div>
              <span className="text-xl font-medium text-grey-1000 tracking-[-0.04em]">
                {showBalance ? (isLoading ? "..." : `$${formattedTotalUsd}`) : "*****"}
              </span>
            </div>
          </div>

          {/* Signers List */}
          <div className="flex flex-col bg-main-white rounded-lg overflow-hidden">
            {account.signers.map((signer, index) => (
              <SignerRow
                key={signer.commitment}
                signer={signer}
                isLast={index === account.signers.length - 1}
                copyToClipboard={copyToClipboard}
              />
            ))}
          </div>

          {/* Edit Account Button */}
          {isSelected && (
            <button
              className="flex items-center justify-center gap-2 w-full h-8 bg-main-violet rounded-lg cursor-pointer"
              onClick={e => {
                e.stopPropagation();
                openModal("editAccount");
              }}
            >
              <Image src="/sidebar/setting.svg" alt="Settings" width={20} height={20} />
              <span className="text-sm font-medium text-main-white tracking-[-0.04em]">Edit account</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Signer Row Component
interface SignerRowProps {
  signer: AccountSigner;
  isLast: boolean;
  copyToClipboard: (text: string, message: string) => void;
}

function SignerRow({ signer, isLast, copyToClipboard }: SignerRowProps) {
  const shortCommitment = formatAddress(signer.commitment, { start: 4, end: 3 });
  const displayName = signer.name || shortCommitment;

  return (
    <div className={`flex items-center justify-between px-3 py-3 ${!isLast ? "border-b border-grey-100" : ""}`}>
      <span className="text-sm font-medium text-grey-1000 tracking-[-0.03em]">{displayName}</span>

      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center justify-center px-1.5 h-[18px] rounded-full cursor-pointer transition-colors bg-main-pink hover:bg-pink-550`}
            onClick={e => {
              e.stopPropagation();
              copyToClipboard(signer.commitment, "Commitment copied to clipboard");
            }}
          >
            <span className="text-xs font-medium text-main-white tracking-[-0.02em] leading-none">
              {shortCommitment}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-[#444444] text-white text-xs px-4 py-1.5 rounded-md border-0">
          <p>Click to copy</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
