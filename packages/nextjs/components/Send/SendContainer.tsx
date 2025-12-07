"use client";

import React, { useEffect, useState } from "react";

export default function SendContainer() {

  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="overflow-hidden relative w-full h-full flex flex-col rounded-lg">
      {/* Background images */}
      <div className="absolute -top-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <img src="/transfer/top-globe.svg" alt="Bottom globe" className="w-full h-full" />
      </div>
      <div className="absolute -bottom-70 flex h-[736.674px] items-center justify-center left-1/2 translate-x-[-50%] w-[780px] pointer-events-none">
        <img src="/transfer/bottom-globe.svg" alt="Bottom globe" className="w-full h-full" />
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-[20px] items-center justify-center flex-1 px-4">
        {/* Title section */}
        <div className="flex flex-col items-center justify-center pt-8">
          <div className="text-[#545454] text-6xl text-center font-bold uppercase w-full">transfering</div>
          <div className="flex gap-[5px] items-center justify-center w-full">
            <div className="text-[#545454] text-6xl text-center font-bold uppercase">t</div>
            <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid"></div>
            <div className="text-[#545454] text-6xl text-center font-bold uppercase">friends</div>
          </div>
        </div>

        {/* Token selector and amount */}
        <div className="flex gap-1 items-center justify-center w-full max-w-md">
          {/* Token selector */}
          <div
            className="bg-white flex gap-1 items-center justify-start pl-1.5 pr-0.5 py-0.5 rounded-full border border-[#e0e0e0] cursor-pointer"
            data-tooltip-id="token-selector-tooltip"
          >
            <img src="/token/eth.svg" alt="Ethereum" className="w-9 h-9" />
          </div>

          {/* Amount input */}
          <input
            type="text"
            value={amount}
            placeholder="0.00"
            onChange={e => setAmount(e.target.value)}
            className="text-text-primary text-[44px] uppercase outline-none w-[90px]"
            disabled={isLoading}
          />
        </div>

        {/* Visual divider */}
        <div className="flex flex-col gap-2.5 items-center justify-center w-full max-w-md h-[100px] relative">
          <div className="h-[75.46px] w-full max-w-[528px] flex items-center justify-center relative">
            <div className="relative w-full h-full">
              <div className="absolute left-1/2 top-0 w-0.5 h-full border-l border-dashed border-gray-300 transform -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-full h-0.5 border-t border-dashed border-gray-300 transform -translate-y-1/2" />
            </div>
            <div className="absolute bg-[#fff] rounded-[32.842px] w-8 h-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-[1px] border-dashed border-[#FF7CEB] shadow-[0_0_20px_rgba(255,124,235,0.5)]">
              <div className="text-text-secondary text-[14px] text-center text-[#676767]">To</div>
            </div>
          </div>
        </div>

        {/* Address input */}
        <div className="flex flex-col gap-[5px] items-center justify-start w-full max-w-xl">
          <div className="flex gap-2.5 items-center justify-center w-full">
            <div className="bg-white grow min-h-px min-w-px relative rounded-[16px] border border-[#e0e0e0] shadow-[0px_0px_10.3px_0px_rgba(135,151,255,0.14),0px_0px_89.5px_0px_rgba(0,0,0,0.05)] p-3 justify-between flex-row flex">
              <input
                type="text"
                placeholder="Enter address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="text-text-secondary text-[16px] outline-none placeholder:text-text-secondary flex-3"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center justify-center w-full max-w-xs">
          <button
            // onClick={handleSendNow}
            // disabled={isLoading || !amount || !address}
            className="bg-[#FF7CEB] flex items-center justify-center px-5 py-2 rounded-[10px] disabled:opacity-50 cursor-pointer border-0 flex-1"
          >
            <span className="font-semibold text-[16px] text-center text-white tracking-[-0.16px]">
              {isLoading ? "Sending..." : "Transfer now"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
