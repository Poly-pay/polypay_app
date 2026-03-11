"use client";

import React, { useState } from "react";
import Image from "next/image";
import ReceiveModal from "../modals/QRAddressReceiverModal";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useAccountStore, useSidebarStore } from "~~/services/store";
import { copyToClipboard } from "~~/utils/copy";
import { getNetworkMeta } from "~~/utils/network";

type CreatedAccountSummary = {
  id: string;
  name: string;
  address: string;
  chainId: number;
};

interface SuccessScreenProps {
  className?: string;
  createdAccounts?: CreatedAccountSummary[];
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ className, createdAccounts }) => {
  const router = useAppRouter();
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [fundAddress, setFundAddress] = useState("");

  const { currentAccount } = useAccountStore();
  const { openManageAccountsWithExpand } = useSidebarStore();

  const isMultiAccount = createdAccounts && createdAccounts.length > 1;

  const handleSeeAccount = (acc: { id: string; chainId: number }) => {
    openManageAccountsWithExpand(acc.id, acc.chainId);
    router.goToDashboard();
  };

  const handleFund = (address: string) => {
    setFundAddress(address);
    setIsReceiveModalOpen(true);
  };

  return (
    <div
      className={`overflow-hidden relative w-full h-full flex flex-col rounded-lg bg-background ${className} border border-divider`}
    >
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4 relative z-10">
        <div className="flex flex-col items-center justify-center pb-8">
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">successfully</div>
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">created</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">acc</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">unt</div>
          </div>
        </div>

        <div className="h-[150px] w-full max-w-[528px] flex flex-col items-center justify-center relative">
          <div className="relative w-full h-full">
            <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
            <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
          </div>
          <Image
            src="/new-account/apple.svg"
            alt="Success Icon"
            width={75}
            height={75}
            className="rounded-full border-dashed border-[1px] border-primary shadow-[0_0_20px_rgba(255,124,235,0.5)] absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 w-full max-w-lg border-[1px] border-gray-200 shadow-sm">
          <div className="text-center">
            <h3 className="text-grey-950 text-[32px] font-medium mb-4">
              {isMultiAccount ? "Your new accounts" : currentAccount?.name}
            </h3>
            <span className="block border-b-[1px] border-gray-200 w-full"></span>

            {isMultiAccount ? (
              /* ── Multi-account view ── */
              <div className="mt-4 flex flex-col gap-3 max-h-[220px] overflow-auto">
                {createdAccounts.map(acc => {
                  const meta = getNetworkMeta(acc.chainId);
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      {/* Network icon */}
                      <Image src={meta.icon} alt={meta.name} width={36} height={36} className="rounded-full shrink-0" />

                      {/* Address (click to copy) */}
                      <div
                        className="flex-1 min-w-0 text-sm text-violet-300 truncate cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors font-family-repetition"
                        onClick={() => copyToClipboard(acc.address, `Address (${meta.name}) copied!`)}
                        title="Click to copy"
                      >
                        {acc.address}
                      </div>

                      {/* View button */}
                      <button
                        onClick={() => handleSeeAccount(acc)}
                        className="shrink-0 bg-grey-1000 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
                      >
                        View
                      </button>

                      {/* Fund button */}
                      <button
                        onClick={() => handleFund(acc.address)}
                        className="shrink-0 bg-primary text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-pink-400 transition-colors"
                      >
                        Fund
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Single-account view (original) ── */
              <div
                className="text-[24px] text-violet-300 leading-relaxed break-all px-2 cursor-pointer hover:bg-gray-200 rounded py-2 transition-colors font-family-repetition"
                onClick={() => copyToClipboard(currentAccount?.address || "", "Address copied to clipboard!")}
                title="Click to copy"
              >
                {currentAccount?.address}
              </div>
            )}

            <span className="block border-b-[1px] border-gray-200 w-full mb-4"></span>

            {/* Bottom buttons – only for single account */}
            {!isMultiAccount && (
              <div className="flex gap-4 items-center justify-center w-full">
                <button
                  onClick={() =>
                    handleSeeAccount({ id: currentAccount?.id || "", chainId: currentAccount?.chainId || 0 })
                  }
                  className="flex-1 bg-grey-1000 flex items-center justify-center px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span className="font-semibold text-base text-center text-white">See your account</span>
                </button>
                <button
                  onClick={() => handleFund(currentAccount?.address || "")}
                  className="flex-1 bg-primary flex items-center justify-center px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span className="font-semibold text-base text-center text-black">Fund your account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        address={fundAddress || currentAccount?.address || ""}
      />
    </div>
  );
};

export default SuccessScreen;
