"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { NATIVE_ETH, NetworkValue, SUPPORTED_TOKENS, Token } from "@polypay/shared";
import { Eye, EyeOff, MoveDown, MoveUp, X } from "lucide-react";
import { Address } from "viem";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useTokenPrices } from "~~/hooks/api/usePrice";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";
import { network } from "~~/utils/network-config";

interface PortfolioModalProps {
  children: React.ReactNode;
}

interface TokenBalanceRowProps {
  token: Token;
  balance: string;
  usdValue: number;
  isLoading: boolean;
}

function TokenBalanceRow({ token, balance, usdValue, isLoading }: TokenBalanceRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      {/* Token Icon with Chain Badge */}
      <div className="relative">
        <Image src={token.icon} alt={token.symbol} width={40} height={40} className="rounded-full" />
        {/* Chain Badge */}
        <div className="absolute bottom-0 right-0 w-5 h-5 bg-black rounded overflow-hidden border border-white">
          <Image src="/token/horizen-badge.svg" alt="Horizen" width={20} height={20} />
        </div>
      </div>

      {/* Token Info */}
      <div className="flex-1 flex flex-col">
        <span className="text-[#1B1B1B] text-base font-semibold leading-6">{token.symbol}</span>
        <span className="text-[#848484] text-sm font-medium leading-5">{token.name}</span>
      </div>

      {/* Balance & USD Value */}
      <div className="flex-1 flex flex-col items-end gap-1">
        <span className="text-[#1B1B1B] text-base font-medium leading-6">
          {isLoading ? "..." : `${balance} ${token.symbol}`}
        </span>
        <span className="text-[#848484] text-sm font-medium leading-5">
          {isLoading
            ? "..."
            : `$${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </span>
      </div>
    </div>
  );
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ children }) => {
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const router = useAppRouter();
  const { openModal } = useModalApp();
  const [showBalance, setShowBalance] = React.useState(true);

  const { balances, isLoading: isLoadingBalances } = useTokenBalances(metaMultiSigWallet?.address);
  const { getPriceBySymbol, isLoading: isLoadingPrices } = useTokenPrices();

  const isLoading = isLoadingBalances || isLoadingPrices;

  // Calculate total portfolio USD value
  const totalUsdValue = React.useMemo(() => {
    if (network === NetworkValue.mainnet) {
      // Mainnet: only native ETH
      const balance = balances[NATIVE_ETH.address] || "0";
      const price = getPriceBySymbol(NATIVE_ETH.symbol);
      return parseFloat(balance) * price;
    }

    // Testnet: all supported tokens
    return SUPPORTED_TOKENS.reduce((sum, token) => {
      const balance = balances[token.address] || "0";
      const price = getPriceBySymbol(token.symbol);
      return sum + parseFloat(balance) * price;
    }, 0);
  }, [balances, getPriceBySymbol, network]);

  // Get USD value for a specific token
  const getTokenUsdValue = (token: Token): number => {
    const balance = balances[token.address] || "0";
    const price = getPriceBySymbol(token.symbol);
    return parseFloat(balance) * price;
  };

  // Get balance for a specific token
  const getTokenBalance = (token: Token): string => {
    return balances[token.address] || "0";
  };

  const toggleShowBalance = () => {
    setShowBalance(!showBalance);
  };

  // Format total USD value
  const formattedTotalUsd = totalUsdValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetTitle></SheetTitle>
      <SheetContent
        side="right"
        className="w-[332px] h-[98%] p-1 border-l-0 top-[8px] right-[5px] rounded-[19px] bg-[#F7F7F7] shadow-[7px_4px_108px_rgba(0,0,0,0.25)]"
      >
        <div className="flex flex-col h-full gap-1">
          {/* Header Card */}
          <div className="relative bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover rounded-2xl overflow-hidden">
            <div className="px-5 pt-6 pb-6 relative">
              {/* Close Button */}
              <SheetClose asChild>
                <Button
                  size="sm"
                  className="absolute top-2 right-2 h-[38px] w-[38px] p-2 bg-white hover:bg-white/70 rounded-[10px] cursor-pointer"
                >
                  <X className="h-[18px] w-[18px] text-[#363636]" />
                </Button>
              </SheetClose>

              {/* Balance Label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#1E1E1E] text-sm font-medium leading-[22px]">Account balance</span>
                <button onClick={toggleShowBalance} className="cursor-pointer">
                  {showBalance ? (
                    <Eye className="w-[14px] h-[14px] text-[#6D2EFF]" />
                  ) : (
                    <EyeOff className="w-[14px] h-[14px] text-[#6D2EFF]" />
                  )}
                </button>
              </div>

              {/* Total USD Value */}
              <div className="flex items-center gap-2 pt-4 mb-6">
                {showBalance ? (
                  <>
                    <span className="text-[#1E1E1E] text-4xl font-normal uppercase leading-9">$</span>
                    <span className="text-[#1E1E1E] text-4xl font-medium uppercase leading-9">
                      {isLoading ? "..." : formattedTotalUsd}
                    </span>
                  </>
                ) : (
                  <span className="text-[#1E1E1E] text-4xl font-medium leading-9">*****</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 p-1 bg-[rgba(0,0,0,0.47)] backdrop-blur-[15px] rounded-[15px]">
                <SheetClose asChild>
                  <Button
                    className="flex-1 h-[38px] px-6 py-2 bg-[rgba(248,248,248,0.13)] hover:bg-[rgba(248,248,248,0.25)] rounded-xl border border-[rgba(255,255,255,0.25)] cursor-pointer"
                    onClick={() => router.goToTransfer()}
                  >
                    <MoveUp className="h-5 w-5 text-[#F7F7F7]" />
                    <span className="text-[#F7F7F7] text-base font-normal leading-[19px]">Transfer</span>
                  </Button>
                </SheetClose>
                <Button
                  className="flex-1 h-[38px] px-6 py-2 bg-[rgba(248,248,248,0.13)] hover:bg-[rgba(248,248,248,0.25)] rounded-xl border border-[rgba(255,255,255,0.25)] cursor-pointer"
                  onClick={() => openModal("qrAddressReceiver", { address: metaMultiSigWallet?.address as Address })}
                >
                  <MoveDown className="h-5 w-5 text-[#F7F7F7]" />
                  <span className="text-[#F7F7F7] text-base font-normal leading-[19px]">Receive</span>
                </Button>
              </div>
            </div>
          </div>

          {/* My Assets Section */}
          <div className="flex-1 bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
            <div className="px-5 pt-4 pb-4">
              <span className="text-[#1B1B1B] text-2xl font-medium">My Assets</span>
            </div>

            <div className="flex flex-col">
              {network === NetworkValue.mainnet ? (
                // Mainnet: only native ETH
                <TokenBalanceRow
                  token={NATIVE_ETH}
                  balance={getTokenBalance(NATIVE_ETH)}
                  usdValue={getTokenUsdValue(NATIVE_ETH)}
                  isLoading={isLoading}
                />
              ) : (
                // Testnet: all supported tokens
                SUPPORTED_TOKENS.map(token => (
                  <TokenBalanceRow
                    key={token.address}
                    token={token}
                    balance={getTokenBalance(token)}
                    usdValue={getTokenUsdValue(token)}
                    isLoading={isLoading}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
