"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useMyAccounts } from "~~/hooks/api";
import { useAccountStore } from "~~/services/store";
import { ModalProps } from "~~/types/modal";
import { getAccountAvatar } from "~~/utils/avatar";
import { formatAddress } from "~~/utils/format";
import { getNetworkMeta } from "~~/utils/network";

const VISIBLE_COUNT = 4;

const SwitchAccountModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { data: accounts = [], isLoading } = useMyAccounts();
  const { currentAccount, setCurrentAccount } = useAccountStore();
  const [startIndex, setStartIndex] = useState(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);

  const networks = useMemo(() => {
    const grouped = new Map<number, number>();
    accounts.forEach(acc => {
      grouped.set(acc.chainId, (grouped.get(acc.chainId) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([chainId, count]) => {
      const meta = getNetworkMeta(chainId);
      return {
        chainId,
        name: meta.name,
        icon: meta.icon,
        count,
      };
    });
  }, [accounts]);

  // Sort accounts: selected account first
  const sortedAccounts = useMemo(() => {
    if (!currentAccount || accounts.length === 0) return accounts;

    const selected = accounts.find(acc => acc.id === currentAccount.id);
    const others = accounts.filter(acc => acc.id !== currentAccount.id);

    return selected ? [selected, ...others] : accounts;
  }, [accounts, currentAccount]);

  // Filtered accounts by selected network
  const filteredAccounts = useMemo(() => {
    if (!selectedChainId) return sortedAccounts;
    return sortedAccounts.filter(acc => acc.chainId === selectedChainId);
  }, [sortedAccounts, selectedChainId]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartIndex(0);
      if (networks.length <= 1) {
        const onlyChainId = networks[0]?.chainId ?? null;
        setSelectedChainId(onlyChainId);
        setStep(2);
      } else {
        setSelectedChainId(null);
        setStep(1);
      }
    }
  }, [isOpen, networks]);

  // Sliding window
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + VISIBLE_COUNT < filteredAccounts.length;

  const handlePrev = () => {
    if (canGoPrev) setStartIndex(prev => prev - 1);
  };

  const handleNext = () => {
    if (canGoNext) setStartIndex(prev => prev + 1);
  };

  const handleSelectAccount = (account: any) => {
    setCurrentAccount(account);
    onClose();
  };

  const handleSelectNetwork = (chainId: number) => {
    const networkAccounts = accounts.filter(acc => acc.chainId === chainId);
    if (networkAccounts.length === 1) {
      handleSelectAccount(networkAccounts[0]);
      return;
    }
    setSelectedChainId(chainId);
    setStep(2);
    setStartIndex(0);
  };

  const handleBackToNetworks = () => {
    setStep(1);
    setSelectedChainId(null);
    setStartIndex(0);
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <div className="lg:w-[850px] w-[700px] flex flex-col bg-grey-0 rounded-2xl border border-grey-200">
        {/* Header - 70px */}
        <div className="flex items-center justify-between px-4 h-[70px]">
          {/* Back button (step 2 with multiple networks) or empty space */}
          {step === 2 && networks.length > 1 ? (
            <button
              onClick={handleBackToNetworks}
              className="w-[38px] h-icon-btn flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-100 transition-colors"
            >
              <ChevronLeft size={18} className="text-grey-1000" />
            </button>
          ) : (
            <div className="w-[38px] h-icon-btn" />
          )}

          {/* Title */}
          <span className="text-xl font-semibold text-grey-1000 uppercase tracking-tight">
            {step === 1 ? "Choose network" : "Choose your account"}
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-[38px] h-icon-btn flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
                stroke="#363636"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-10 pb-10 gap-5">
          {/* Loading / empty states */}
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-grey-500">Loading accounts...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-grey-500">No accounts found</span>
            </div>
          ) : (
            <>
              {/* Step 1: Choose network */}
              {step === 1 && (
                <div className="w-full flex items-center justify-center gap-4 mt-4">
                  {networks.map(network => (
                    <button
                      key={network.chainId}
                      type="button"
                      onClick={() => handleSelectNetwork(network.chainId)}
                      className="flex flex-col items-center gap-4 w-[200px] h-[220px] justify-center rounded-2xl border border-grey-200 bg-white hover:border-violet-300 hover:bg-grey-50 transition-all"
                    >
                      <Image src={network.icon} alt={network.name} width={120} height={120} className="rounded-full" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-semibold text-grey-1000">{network.name}</span>
                        <span className="text-xs text-grey-500">{network.count} account(s)</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Choose account */}
              {step === 2 && (
                <>
                  {/* Account Cards Container */}
                  <div
                    className={`relative w-full h-[248px] overflow-hidden mt-5 flex items-center ${filteredAccounts.length <= VISIBLE_COUNT ? "justify-center" : ""}`}
                  >
                    <div
                      className={`flex gap-4 transition-transform duration-300 ease-in-out ${filteredAccounts.length > VISIBLE_COUNT ? "absolute pl-4" : ""}`}
                      style={
                        filteredAccounts.length > VISIBLE_COUNT
                          ? { transform: `translateX(-${startIndex * (160 + 16)}px)` }
                          : undefined
                      }
                    >
                      {filteredAccounts.map(account => {
                        const isSelected = currentAccount?.id === account.id;
                        const avatarSrc = getAccountAvatar(account, accounts);

                        return (
                          <div
                            key={account.id}
                            className="relative flex flex-col items-center cursor-pointer transition-opacity duration-300"
                            onClick={() => handleSelectAccount(account)}
                          >
                            {/* Selected border wrapper */}
                            <div
                              className={`
                                relative flex flex-col items-center gap-4 p-2 transition-all duration-200
                                ${
                                  isSelected
                                    ? "border-[1.5px] border-violet-300 rounded-[10px]"
                                    : "border-[1.5px] border-transparent"
                                }
                              `}
                            >
                              {/* Checkbox */}
                              {isSelected && (
                                <div className="absolute top-0 -right-2 w-8 h-8 flex items-center justify-center rounded-full bg-green-325 border-2 border-white z-10">
                                  <Check size={16} strokeWidth={2} className="text-grey-1000" />
                                </div>
                              )}

                              {/* Avatar */}
                              <div className="w-[160px] h-[160px] rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
                                <Image
                                  src={avatarSrc}
                                  alt={account.name || "Account"}
                                  width={160}
                                  height={160}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Account name + address */}
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xl font-semibold text-grey-1000 tracking-tight text-center truncate max-w-[160px]">
                                  {account.name || "Unnamed"}
                                </span>
                                <span className="text-xs text-grey-500 tracking-tight">
                                  {formatAddress(account.address, { start: 4, end: 3 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  <div className="flex items-center justify-center gap-[10px]">
                    <button
                      onClick={handlePrev}
                      disabled={!canGoPrev}
                      className={`
                        w-16 h-16 flex items-center justify-center rounded-full bg-grey-100 
                        transition-all duration-200
                        ${
                          canGoPrev
                            ? "hover:bg-grey-200 hover:scale-105 cursor-pointer"
                            : "opacity-40 cursor-not-allowed"
                        }
                      `}
                    >
                      <ChevronLeft size={24} className="text-grey-1000" />
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={!canGoNext}
                      className={`
                        w-16 h-16 flex items-center justify-center rounded-full bg-grey-100 
                        transition-all duration-200
                        ${
                          canGoNext
                            ? "hover:bg-grey-200 hover:scale-105 cursor-pointer"
                            : "opacity-40 cursor-not-allowed"
                        }
                      `}
                    >
                      <ChevronRight size={24} className="text-grey-1000" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ModalContainer>
  );
};

export default SwitchAccountModal;
