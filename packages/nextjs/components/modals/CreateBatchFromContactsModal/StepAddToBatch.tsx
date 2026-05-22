"use client";

import Image from "next/image";
import type { BatchContactEntry, ResolveToken } from "./types";
import { GripVertical } from "lucide-react";
import { TokenPillPopover } from "~~/components/popovers/TokenPillPopover";
import { formatAddress } from "~~/utils/format";

export function StepAddToBatch({
  entries,
  resolveToken,
  onUpdateAmount,
  onUpdateToken,
  onRemove,
}: {
  entries: BatchContactEntry[];
  resolveToken: ResolveToken;
  onUpdateAmount: (index: number, amount: string) => void;
  onUpdateToken: (index: number, tokenAddress: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => {
        const selectedToken = resolveToken(entry.tokenAddress);
        return (
          <div key={entry.contact.id} className="bg-grey-50 flex items-center justify-between px-4 py-3 rounded-xl">
            <div className="flex items-center gap-3 shrink-0">
              <GripVertical size={16} className="text-grey-400" />
              <span className="text-sm font-medium text-main-violet">Transfer</span>
              <Image src="/avatars/default-avt.svg" alt="avatar" width={40} height={40} className="rounded-full" />
              <div className="flex flex-col gap-1">
                {!entry.contact.name && (
                  <span className="font-medium text-grey-950">
                    {formatAddress(entry.contact.address, { start: 4, end: 4 })}
                  </span>
                )}
                {entry.contact.name && (
                  <>
                    <span className="font-medium text-grey-950">{entry.contact.name}</span>
                    <span className="text-sm text-grey-500">
                      {formatAddress(entry.contact.address, { start: 4, end: 4 })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-grey-200 rounded-full pl-4 pr-2 py-2 bg-white w-[250px]">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter amount"
                  value={entry.amount}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      onUpdateAmount(index, val);
                    }
                  }}
                  className="flex-1 text-base font-medium outline-none bg-transparent min-w-0"
                />
                <TokenPillPopover
                  selectedToken={selectedToken}
                  onSelect={(tokenAddress: string) => onUpdateToken(index, tokenAddress)}
                />
              </div>
              <button onClick={() => onRemove(index)} className="cursor-pointer">
                <Image src="/contact-book/trash.svg" alt="delete" width={24} height={24} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
