"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NATIVE_ETH, NetworkValue, SUPPORTED_TOKENS, Token } from "@polypay/shared";
import { network } from "~~/utils/network-config";

interface TokenSelectorProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  disabled?: boolean;
}

export function TokenSelector({ selectedToken, onSelect, disabled = false }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current && popoverRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();

      const left = buttonRect.left - popoverRect.width - 12;
      const top = buttonRect.top - 12;

      setPosition({ top, left });
    }
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleTokenSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`bg-white flex gap-1 items-center justify-start pl-1.5 pr-2 py-1 rounded-full transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{ boxShadow: "0 4px 24.5px 0 rgba(46, 119, 255, 0.25)" }}
      >
        <Image src={selectedToken.icon} alt={selectedToken.symbol} width={24} height={24} />
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed w-40 bg-white rounded-2xl shadow-lg border border-grey-100 z-50 py-2"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {/* Arrow */}
          <Image
            src="/icons/arrows/popover-arrow.svg"
            alt="arrow"
            width={32}
            height={32}
            className="absolute -right-6"
            style={{
              top: buttonRef.current ? `${16 + buttonRef.current.getBoundingClientRect().height / 2}px` : "32px",
              transform: "translateY(-50%)",
            }}
          />

          {/* Token list */}
          <div className="flex flex-col">
            {SUPPORTED_TOKENS.map(token => (
              <div
                key={token.address}
                onClick={() => handleTokenSelect(token)}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                  token.address === selectedToken.address ? "bg-gray-50" : ""
                }`}
              >
                <Image src={token.icon} alt={token.symbol} width={20} height={20} />
                <span className="text-sm font-medium">{token.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
