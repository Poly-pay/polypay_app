"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useMyAccounts } from "~~/hooks/api";
import { useAccountStore } from "~~/services/store";
import { ModalProps } from "~~/types/modal";
import { getAvatarByAccountId } from "~~/utils/avatar";

const VISIBLE_COUNT = 4;

const SwitchAccountModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { data: accounts = [], isLoading } = useMyAccounts();
  const { currentAccount, setCurrentAccount } = useAccountStore();
  const [startIndex, setStartIndex] = useState(0);

  // Sort accounts: selected account first
  const sortedAccounts = useMemo(() => {
    if (!currentAccount || accounts.length === 0) return accounts;

    const selected = accounts.find(acc => acc.id === currentAccount.id);
    const others = accounts.filter(acc => acc.id !== currentAccount.id);

    return selected ? [selected, ...others] : accounts;
  }, [accounts, currentAccount]);

  // Reset startIndex when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartIndex(0);
    }
  }, [isOpen]);

  // Sliding window
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + VISIBLE_COUNT < sortedAccounts.length;

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

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <div className="lg:w-[850px] w-[700px] flex flex-col bg-grey-0 rounded-2xl border border-grey-200">
        {/* Header - 70px */}
        <div className="flex items-center justify-between px-4 h-[70px]">
          {/* Empty space for balance */}
          <div className="w-[38px] h-[38px]" />

          {/* Title */}
          <span className="text-xl font-semibold text-grey-1000 uppercase tracking-tight">Choose your account</span>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-100 transition-colors"
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
          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-grey-500">Loading accounts...</span>
            </div>
          ) : sortedAccounts.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-grey-500">No accounts found</span>
            </div>
          ) : (
            <>
              {/* Account Cards Container - with overflow hidden for animation */}
              <div className="relative w-full h-[248px] overflow-hidden mt-5 flex items-center justify-center">
                <div
                  className="flex gap-4 absolute transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${startIndex * (160 + 16)}px)`, // 160px card + 16px gap
                  }}
                >
                  {sortedAccounts.map(account => {
                    const isSelected = currentAccount?.id === account.id;
                    const avatarSrc = getAvatarByAccountId(account.id);

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
                            ${isSelected ? "border-[1.5px] border-violet-300 rounded-[10px]" : "border-[1.5px] border-transparent"}
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

                          {/* Account name */}
                          <span className="text-xl font-semibold text-grey-1000 tracking-tight text-center truncate max-w-[160px]">
                            {account.name || "Unnamed"}
                          </span>
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
                    ${canGoPrev ? "hover:bg-grey-200 hover:scale-105 cursor-pointer" : "opacity-40 cursor-not-allowed"}
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
                    ${canGoNext ? "hover:bg-grey-200 hover:scale-105 cursor-pointer" : "opacity-40 cursor-not-allowed"}
                  `}
                >
                  <ChevronRight size={24} className="text-grey-1000" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalContainer>
  );
};

export default SwitchAccountModal;
