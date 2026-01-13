"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatAddress } from "~~/utils/format";

interface AddressNamedTooltipProps {
  address: string;
  name?: string;
  children: React.ReactNode;
  isHighlighted?: boolean;
}

export default function AddressNamedTooltip({
  address,
  name,
  children,
  isHighlighted = false,
}: AddressNamedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      const top = triggerRect.top - tooltipRect.height - 10;

      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className="w-fit"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 text-xs font-medium px-3 py-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap ${
            isHighlighted ? "bg-white text-black" : "bg-grey-950 text-white"
          }`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className={`flex gap-1 items-center text-xs ${isHighlighted ? "text-black" : "text-white"}`}>
            {name && <div className="font-semibold">{name}</div>}
            <div>{"(" + formatAddress(address, { start: 3, end: 3 }) + ")"}</div>
          </div>
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isHighlighted ? "bg-white" : "bg-grey-950"}`}
            style={{ bottom: "-4px" }}
          />
        </div>
      )}
    </>
  );
}
