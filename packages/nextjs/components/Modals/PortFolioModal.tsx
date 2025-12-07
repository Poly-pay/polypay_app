"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { ArrowDown, ArrowLeftRight, ArrowUp, Send, X } from "lucide-react";

interface PortfolioModalProps {
  children: React.ReactNode;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ children }) => {
  const router = useRouter();
  const [showBalance, setShowBalance] = React.useState(true);

  const toggleShowBalance = () => {
    setShowBalance(!showBalance);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetTitle></SheetTitle>
      <SheetContent side="right" className="w-[386px] h-[90%] p-0 border-l-0 top-[50px] right-[10px] rounded-lg">
        <div className="flex flex-col h-full">
          {/* Header with Balance Card */}
          <div className="relative bg-[url('/portfolio/bg-portfolio.png')] bg-no-repeat bg-cover rounded-lg">
            {/* Blue gradient background */}
            <div className="px-4 pt-4 pb-6 text-white relative overflow-hidden ">
              {/* Close button */}
              <div className="flex flex-column justify-between items-start mb-4 relative z-10 gap-1">
                <div className="text-sm font-medium flex gap-2 items-center">
                  <span>Wallet balance</span>{" "}
                  <img
                    src="/portfolio/eye.svg"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                    onClick={toggleShowBalance}
                  />
                </div>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h8 w-8 p-4 text-black bg-white hover:bg-white/70 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
              </div>

              {/* Balance */}
              <div className="relative z-10 mb-3">
                <div className="text-3xl">
                  {/* {getCurrentNetwork()?.name}{" "}
                  <span className="font-bold">
                    {isLoading ? (
                      <Skeleton className=" h-5 w-[100px] inline-block" />
                    ) : showBalance ? (
                      tokenData[0]?.balance ?? "0.00"
                    ) : (
                      // portfolio?.icp_balance?.balance_icp ?? "0.00"
                      "*****"
                    )}
                  </span> */}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 relative z-10">
                <SheetClose asChild>
                  <Button
                    size="lg"
                    className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm flex items-center gap-1 cursor-pointer"
                    onClick={() => router.push("/send")}
                  >
                    <img src={"/arrow/thin-arrow-up.svg"} className="brightness-0 invert" />
                    Send
                  </Button>
                </SheetClose>
                {/* <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm flex items-center gap-1"
                >
                  <ArrowDown className="h-3 w-3" />
                  Receive
                </Button>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm flex items-center gap-1"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Swap
                </Button> */}
              </div>
            </div>
          </div>

          {/* Token Assets */}
          <div className="flex-1 bg-white rounded-lg">
            {/* Section header */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Token Assets</div>
              </div>
            </div>

            {/* Token list */}
            <div className="flex-1 overflow-y-auto"></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
