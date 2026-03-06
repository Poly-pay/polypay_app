"use client";

import React from "react";
import Image from "next/image";
import { Account } from "@polypay/shared";
import { useSidebarStore } from "~~/services/store";
import { getDefaultChainId, getNetworkMeta } from "~~/utils/network";

interface NetworkChooserSidebarProps {
  isOpen: boolean;
  accounts: Account[];
  onSelectNetwork: (chainId: number | null) => void;
}

const NETWORKS_MAINNET = [26514, 8453];
const NETWORKS_TESTNET = [2651420, 84532];

export default function NetworkChooserSidebar({ isOpen, accounts, onSelectNetwork }: NetworkChooserSidebarProps) {
  const { selectedNetworkChainId } = useSidebarStore();
  const defaultChainId = getDefaultChainId();
  const networks = defaultChainId === 2651420 ? NETWORKS_TESTNET : NETWORKS_MAINNET;

  return (
    <div
      className={`
        absolute left-full top-0 z-30 ml-3
        w-[330px] h-full bg-main-white rounded-lg p-3 flex flex-col gap-[15px]
        shadow-sidebar
        transform transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-medium text-main-black tracking-[-0.01em]">Choose network</h2>
        </div>
      </div>

      {/* Networks list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {networks.map(chainId => {
          const meta = getNetworkMeta(chainId);
          const accountCount = accounts.filter(a => a.chainId === chainId).length;
          const isActive = selectedNetworkChainId === chainId;

          return (
            <button
              key={chainId}
              type="button"
              onClick={() => onSelectNetwork(chainId)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border text-left transition-colors ${
                isActive ? "border-main-pink bg-pink-25" : "border-grey-200 bg-main-white hover:bg-grey-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Image src={meta.icon} alt={meta.name} width={36} height={36} className="rounded-full" />
                <span className="text-sm font-semibold text-main-black">{meta.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-grey-500">{accountCount} accounts</span>
                <Image src="/icons/arrows/chevron-right-purple.svg" alt="Select" width={14} height={14} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
