"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SUPPORTED_TOKENS, Token } from "@polypay/shared";
import { useMetaMultiSigWallet, useTokenPrices } from "~~/hooks";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";

interface TokenPillPopoverProps {
  selectedToken: Token;
  onSelect: (tokenAddress: string) => void;
  arrowSrc?: string;
  arrowWidth?: number;
  arrowHeight?: number;

  pillClassName?: string;
  popoverClassName?: string;
}

export function TokenPillPopover({
  selectedToken,
  onSelect,
  arrowSrc = "/batch/popover-arrow.svg",
  arrowWidth = 28,
  arrowHeight = 28,
  pillClassName,
  popoverClassName,
}: TokenPillPopoverProps) {
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { balances } = useTokenBalances(metaMultiSigWallet?.address);
  const { getPriceBySymbol, isLoading: isLoadingPrices } = useTokenPrices();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const getTokenUsdValue = (token: Token): string => {
    const balance = parseFloat(balances[token.address] || "0");
    const price = getPriceBySymbol(token.symbol);
    const usdValue = balance * price;
    return usdValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => setOpen(v => !v)}
        className={
          pillClassName ??
          "bg-white flex gap-1 items-center justify-start pl-1.5 pr-2 py-1 rounded-full cursor-pointer transition-colors"
        }
        style={{ boxShadow: "0 4px 24.5px 0 rgba(46, 119, 255, 0.25)" }}
      >
        <Image src={"/arrow/dropdown.svg"} alt="icon" width={14} height={14} />
        <Image src={selectedToken.icon} alt={selectedToken.symbol} width={24} height={24} />
      </div>

      {open && (
        <div
          className={
            popoverClassName ??
            "absolute right-full -top-3 mr-5 bg-white rounded-2xl border border-grey-200 shadow-lg z-20"
          }
        >
          <Image
            src={arrowSrc}
            alt="arrow"
            width={arrowWidth}
            height={arrowHeight}
            className="absolute -right-6 top-4"
          />

          <div className="py-1 min-w-[300px]">
            {SUPPORTED_TOKENS.filter(token => token.address !== selectedToken.address).map(token => (
              <div
                key={token.address}
                onClick={() => {
                  onSelect(token.address);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#FF7CEB1A] cursor-pointer first:rounded-t-lg last:rounded-b-lg"
              >
                <Image key={token.address} src={token.icon} alt={token.symbol} width={32} height={32} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-grey-800 text-xs">{token.symbol}</p>
                </div>
                <div className="text-right">
                  {/* // TODO : convert amount to USD price */}
                  <p className="text-grey-950 font-medium">
                    <span className="text-grey-300">$</span> {isLoadingPrices ? "..." : getTokenUsdValue(token)}
                  </p>
                  <p className="text-grey-800 text-xs">
                    {balances[token.address] || "0"} {token.symbol}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
