"use client";

import React from "react";
import Image from "next/image";
import { getDefaultChainId, getNetworkMeta } from "~~/utils/network";

interface ChooseNetworkProps {
  className?: string;
  selectedChainIds: number[];
  onToggleChain: (chainId: number) => void;
  onNextStep: () => void;
}

const HORIZEN_MAINNET = 26514;
const BASE_MAINNET = 8453;

const ChooseNetwork: React.FC<ChooseNetworkProps> = ({ className, selectedChainIds, onToggleChain, onNextStep }) => {
  const defaultChainId = getDefaultChainId();

  const networks = [
    { chainId: HORIZEN_MAINNET, fallbackChainId: 2651420 },
    { chainId: BASE_MAINNET, fallbackChainId: 84532 },
  ].map(n => {
    // If we are on testnet env, use testnet ids instead
    const chainId = defaultChainId === 2651420 ? n.fallbackChainId : n.chainId;
    return { chainId, meta: getNetworkMeta(chainId) };
  });

  const isSelected = (chainId: number) => selectedChainIds.includes(chainId);

  const handleCardClick = (chainId: number) => {
    onToggleChain(chainId);
  };

  return (
    <div className={`flex flex-col min-h-full px-8 py-10 z-[100] ${className ?? ""}`}>
      {/* Title - same style as other steps */}
      <div className="flex flex-col items-center justify-center">
        <div className="text-grey-1000 text-6xl text-center font-semibold uppercase w-full">create new</div>
        <div className="flex gap-[5px] items-center justify-center w-full">
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">acc</div>
          <div className="h-[48px] relative rounded-full w-[125.07px] border-[4.648px] border-primary border-solid" />
          <div className="text-grey-1000 text-6xl text-center font-semibold uppercase">unt</div>
        </div>

        {/* Step description */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <span className="text-text-primary uppercase text-[24px] font-semibold">1. Choose network</span>
          <span className="text-text-secondary text-[14px] text-gray-500 max-w-[420px]">
            Choose which networks you want your account to be active on. You can add more networks later.
          </span>
        </div>
      </div>

      {/* Network cards - vertically centered between header & nav */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-row gap-4 items-stretch justify-center">
          {networks.map(({ chainId, meta }) => {
            const selected = isSelected(chainId);
            return (
              <button
                key={chainId}
                type="button"
                onClick={() => handleCardClick(chainId)}
                className={`relative flex flex-col items-center gap-4 px-10 py-12 rounded-[24px] border-[1.5px] w-[220px] md:w-[240px] transition-all
              ${
                selected
                  ? "border-violet-300 shadow-[0_0_20px_rgba(109,46,255,0.25)] bg-white"
                  : "border-grey-200 bg-white hover:border-violet-200"
              }`}
              >
                <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden">
                  <Image
                    src={meta.icon}
                    alt={meta.name}
                    width={120}
                    height={120}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[18px] font-semibold text-grey-950">{meta.name}</span>

                {/* Small radio indicator top-right */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-grey-100 flex items-center justify-center">
                  <div
                    className={`w-6 h-6 rounded-full border ${
                      selected ? "bg-primary border-white" : "bg-white border-grey-300"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-end w-full pb-2">
        {/* Next button */}
        <button
          type="button"
          onClick={onNextStep}
          disabled={selectedChainIds.length === 0}
          className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all bg-gray-100 ${
            selectedChainIds.length === 0
              ? "cursor-not-allowed disabled:cursor-not-allowed"
              : "cursor-pointer hover:scale-105 bg-main-black"
          }`}
        >
          <Image
            src="/icons/arrows/arrow-right-white.svg"
            alt="Next"
            width={24}
            height={24}
            className={selectedChainIds.length === 0 ? "" : "brightness-0 invert"}
          />
        </button>
      </div>
    </div>
  );
};

export default ChooseNetwork;
