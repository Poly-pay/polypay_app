"use client";

import Image from "next/image";
import type { BatchContactEntry, ResolveToken } from "./types";
import { formatAddress } from "~~/utils/format";

export function StepTransactionSummary({
  entries,
  resolveToken,
}: {
  entries: BatchContactEntry[];
  resolveToken: ResolveToken;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-grey-600 text-center">
        Please review the information below and confirm to make the transaction.
      </p>
      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const token = resolveToken(entry.tokenAddress);
          return (
            <div key={index} className="bg-grey-50 flex items-center gap-6 px-6 py-3 rounded-xl">
              <span className="text-sm font-medium text-main-violet shrink-0">Transfer</span>
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-2 w-[220px]">
                  <Image src={token.icon} alt={token.symbol} width={20} height={20} />
                  <span className="text-sm font-medium text-grey-950">
                    {entry.amount} {token.symbol}
                  </span>
                </div>
                <Image
                  src="/icons/arrows/arrow-right-long-purple.svg"
                  alt="arrow"
                  width={64}
                  height={20}
                  className="shrink-0"
                />
                <div className="flex items-center gap-2 bg-white rounded-full pl-1 pr-4 py-1">
                  <Image src="/avatars/default-avt.svg" alt="avatar" width={16} height={16} className="rounded-full" />
                  <span className="text-xs font-medium text-main-black">
                    {entry.contact.name} ({formatAddress(entry.contact.address, { start: 4, end: 4 })})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
