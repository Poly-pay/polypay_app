"use client";

import React, { useState } from "react";
import { DepositTab } from "./DepositTab";
import { RegisterMixerVk } from "./RegisterMixerVk";
import { WithdrawTab } from "./WithdrawTab";

type TabId = "deposit" | "withdraw";

export default function MixerContainer() {
  const [activeTab, setActiveTab] = useState<TabId>("deposit");

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-grey-950 mb-2">Private Transfer (Mixer)</h1>
      <p className="text-grey-600 text-sm mb-6">
        Deposit from your wallet, then withdraw to a different address. On-chain link between deposit and withdrawal is
        broken.
      </p>

      <div className="mb-6">
        <RegisterMixerVk />
      </div>

      <div className="flex gap-2 mb-6 border-b border-grey-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "deposit"
              ? "border-main-magenta text-main-magenta"
              : "border-transparent text-grey-500 hover:text-grey-700"
          }`}
          onClick={() => setActiveTab("deposit")}
        >
          Deposit
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "withdraw"
              ? "border-main-magenta text-main-magenta"
              : "border-transparent text-grey-500 hover:text-grey-700"
          }`}
          onClick={() => setActiveTab("withdraw")}
        >
          Withdraw
        </button>
      </div>

      <div className="bg-grey-50 rounded-xl p-4 border border-grey-200">
        {activeTab === "deposit" ? <DepositTab /> : <WithdrawTab />}
      </div>
    </div>
  );
}
