"use client";

import React from "react";
import Image from "next/image";
import { Balance } from "../scaffold-eth";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { ReceiveModal } from "./ReceiveModal";
import { Eye, MoveDown, MoveUp, X } from "lucide-react";
import { Address } from "viem";
import { NATIVE_ETH, SUPPORTED_TOKENS, Token } from "~~/constants";
import { useMetaMultiSigWallet } from "~~/hooks";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useTokenBalances } from "~~/hooks/app/useTokenBalance";

interface PortfolioModalProps {
  children: React.ReactNode;
}

function TokenBalanceRow({ token, balance, isLoading }: { token: Token; balance: string; isLoading: boolean }) {
  return (
    <span className="flex flex-row justify-between items-end mb-4">
      <span className="flex flex-row">
        <Image src={token.icon} alt={token.symbol} width={35} height={35} className="inline-block mr-2 mb-1" />
        <span className="flex flex-col">
          <span className="text-[#1B1B1B] font-semibold">{token.symbol}</span>
          <span className="text/sub-600">Ethereum</span>
        </span>
      </span>
      <span>{isLoading ? "..." : `${balance} ${token.symbol}`}</span>
    </span>
  );
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ children }) => {
  const metaMultiSigWallet = useMetaMultiSigWallet();

  const router = useAppRouter();
  const [showBalance, setShowBalance] = React.useState(true);

  const { balances, isLoading: isLoadingBalances } = useTokenBalances(metaMultiSigWallet?.address);

  const toggleShowBalance = () => {
    setShowBalance(!showBalance);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetTitle></SheetTitle>
      <SheetContent side="right" className="w-[300px] h-[90%] p-0 border-l-0 top-[50px] right-[10px] rounded-lg">
        <div className="flex flex-col h-full bg-gray-200 p-1 rounded-lg">
          <div className="relative bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover rounded-2xl">
            <div className="px-4 pt-4 pb-6 text-white relative overflow-hidden ">
              <div className="flex flex-column justify-between items-start mb-1 relative z-10 gap-1">
                <div className="text-sm font-medium flex gap-2 items-center">
                  <span className="text-black">Wallet balance</span>{" "}
                  <Eye color="black" width={16} height={16} className="cursor-pointer" onClick={toggleShowBalance} />
                </div>
                <SheetTrigger asChild>
                  <Button size="sm" className="h8 w-8 p-4 text-black bg-white hover:bg-white/70 cursor-pointer">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
              </div>

              <div className="relative z-10 mb-3">
                <div className="text-3xl">
                  {showBalance ? (
                    <span className="flex flex-row items-center text-[#1E1E1E]">
                      <Image src="/token/eth.svg" alt="ETH" width={24} height={24} className="inline-block mr-2 mb-1" />
                      <Balance address={metaMultiSigWallet?.address as Address} className="min-h-0 h-auto text-black" />
                    </span>
                  ) : (
                    <span>*****</span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 relative z-10 items-center bg-[#00000078] w-fit p-1 rounded-md">
                <SheetClose asChild>
                  <Button
                    size="lg"
                    className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm flex items-center gap-1 cursor-pointer h-[38px] w-[108px]"
                    onClick={router.goToTransfer}
                  >
                    <MoveUp className="h-3 w-3" />
                    Transfer
                  </Button>
                </SheetClose>
                <ReceiveModal address={metaMultiSigWallet?.address as Address}>
                  <Button
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm flex items-center gap-1 cursor-pointer h-[38px] w-[108px]"
                  >
                    <MoveDown className="h-3 w-3" />
                    Receive
                  </Button>
                </ReceiveModal>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl h-full">
            <span className="text-[24px] text[#1B1B1B] font-semibold">My Assets</span>
            <div className="mt-3">
              {SUPPORTED_TOKENS.filter(token => token.address !== NATIVE_ETH.address).map(token => (
                <TokenBalanceRow
                  key={token.address}
                  token={token}
                  balance={balances[token.address] || "0"}
                  isLoading={isLoadingBalances}
                />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
