"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ResolvedToken } from "@polypay/shared";
import NetworkBadge from "~~/components/Common/NetworkBadge";
import { useMetaMultiSigWallet, useTokenPrices } from "~~/hooks";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";
import { useClickOutside } from "~~/hooks/useClickOutside";
import { useAccountStore } from "~~/services/store";
import { getDefaultChainId } from "~~/utils/network";

interface TokenPillPopoverProps {
  selectedToken: ResolvedToken;
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
  arrowSrc = "/icons/arrows/popover-arrow.svg",
  arrowWidth = 28,
  arrowHeight = 28,
  pillClassName,
  popoverClassName,
}: TokenPillPopoverProps) {
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { getPriceBySymbol, isLoading: isLoadingPrices } = useTokenPrices();
  const { tokens } = useNetworkTokens();
  const { currentAccount } = useAccountStore();
  const { balances } = useTokenBalances(metaMultiSigWallet?.address, currentAccount?.chainId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const networkChainId = currentAccount?.chainId ?? getDefaultChainId();

  useClickOutside(rootRef, () => setOpen(false), { isActive: open });

  const getTokenUsdValue = (token: ResolvedToken): string => {
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
        className={`${
          pillClassName ??
          "bg-white flex gap-1 items-center justify-start pl-1.5 pr-2 py-1 rounded-full cursor-pointer transition-colors"
        } shadow-popover`}
      >
        <Image src={"/icons/arrows/dropdown.svg"} alt="icon" width={14} height={14} />
        <div className="relative">
          <Image src={selectedToken.icon} alt={selectedToken.symbol} width={24} height={24} />
          <div className="absolute -bottom-1 -right-1">
            <NetworkBadge chainId={networkChainId} size={14} />
          </div>
        </div>
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

          <div className="py-1 xl:min-w-[300px] min-w-[220px]">
            {tokens.map(token => (
              <div
                key={token.address}
                onClick={() => {
                  onSelect(token.address);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-pink-350/10 cursor-pointer first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="relative">
                  <Image src={token.icon} alt={token.symbol} width={32} height={32} />
                  <div className="absolute -bottom-1 -right-1">
                    <NetworkBadge chainId={networkChainId} size={16} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-grey-800 text-xs">{token.symbol}</p>
                </div>
                <div className="text-right">
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
