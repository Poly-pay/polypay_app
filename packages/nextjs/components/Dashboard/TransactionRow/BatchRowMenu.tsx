"use client";

import { useRef, useState } from "react";
import { Contact, ZERO_ADDRESS, formatTokenAmount, getTokenByAddress } from "@polypay/shared";
import { Copy, MoreVertical } from "lucide-react";
import { BatchContactEntry } from "~~/components/modals/CreateBatchFromContactsModal";
import { modalManager } from "~~/components/modals/ModalLayout";
import { BatchTransfer } from "~~/hooks";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { useClickOutside } from "~~/hooks/useClickOutside";
import { useAccountStore } from "~~/services/store";
import { formatAddress } from "~~/utils/format";

interface BatchRowMenuProps {
  batchData: BatchTransfer[];
}

export function BatchRowMenu({ batchData }: BatchRowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { chainId } = useNetworkTokens();
  const { currentAccount } = useAccountStore();

  useClickOutside(containerRef, () => setOpen(false), { isActive: open });

  const handleDuplicate = () => {
    setOpen(false);

    const initialBatchItems: BatchContactEntry[] = batchData.map(transfer => {
      const token = getTokenByAddress(transfer.tokenAddress, chainId);
      const amount = formatTokenAmount(transfer.amount, token.decimals);

      const contact: Contact = {
        id: crypto.randomUUID(),
        name: transfer.contactName || formatAddress(transfer.recipient, { start: 6, end: 4 }),
        address: transfer.recipient,
        accountId: "",
        groups: [],
        createdAt: "",
        updatedAt: "",
      } as Contact;

      return {
        contact,
        amount,
        tokenAddress: transfer.tokenAddress || ZERO_ADDRESS,
        isSynthetic: true,
      };
    });

    modalManager.openModal?.("createBatchFromContacts", {
      accountId: currentAccount?.id,
      initialBatchItems,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="p-1.5 rounded-lg hover:bg-grey-100 cursor-pointer transition-colors"
      >
        <MoreVertical size={18} className="text-grey-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-grey-200 py-1 z-50 min-w-[180px]">
          <button
            onClick={e => {
              e.stopPropagation();
              handleDuplicate();
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-grey-800 hover:bg-grey-50 w-full cursor-pointer"
          >
            <Copy size={16} />
            Create batch again
          </button>
        </div>
      )}
    </div>
  );
}
