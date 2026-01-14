"use client";

import React, { useMemo, useState } from "react";
import { Fragment } from "react";
import Image from "next/image";
import EditBatchPopover from "../popovers/EditBatchPopover";
import TransactionSummary from "./TransactionSummary";
import { BatchItem, Token, parseTokenAmount } from "@polypay/shared";
import { getTokenByAddress } from "@polypay/shared";
import AddressNamedTooltip from "~~/components/tooltips/AddressNamedTooltip";
// import { Token, parseTokenAmount } from "~~/constants";
import { useBatchTransaction, useContacts, useModalApp } from "~~/hooks";
import { useDeleteBatchItem, useMyBatchItems, useUpdateBatchItem } from "~~/hooks/api";
import { useAccountStore } from "~~/services/store";
import { formatAddress, formatAmount } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";

// ==================== Custom Checkbox ====================
function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`w-4 h-4 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
        checked ? "bg-main-pink border-white" : "bg-grey-200 border-grey-400"
      }`}
    ></div>
  );
}

// ==================== Header Component ====================
function Header() {
  return (
    <section>
      <h3 className="text-grey-950 text-4xl">Your Batch</h3>
      <p className="text-grey-700 text-sm max-w-[490px] mt-3 mb-0">
        Making bulk transactions will save you time as well as transaction costs. Below is a list of transactions that
        have been recently added.
      </p>
    </section>
  );
}

// ==================== Batch Transactions Component ====================
function BatchTransactions({
  batchItems,
  selectedItems,
  activeItem,
  onSelectAll,
  onSelectItem,
  onRemove,
  onEdit,
  isLoading,
  isRemoving,
  accountId,
}: {
  batchItems: BatchItem[];
  selectedItems: Set<string>;
  activeItem: string | null;
  onSelectAll: () => void;
  onSelectItem: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, data: { recipient: string; amount: string; token: Token; contactId?: string }) => void;
  isLoading?: boolean;
  isRemoving?: boolean;
  accountId: string | null;
}) {
  const { openModal } = useModalApp();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const { data: contacts = [] } = useContacts(accountId);

  const editButtonRefs = useMemo<Record<string, React.RefObject<HTMLButtonElement | null>>>(() => {
    const refs: Record<string, React.RefObject<HTMLButtonElement | null>> = {};
    batchItems.forEach(item => {
      refs[item.id] = { current: null };
    });
    return refs;
  }, [batchItems]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-text-secondary">Loading batch items...</div>
      </div>
    );
  }

  if (batchItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full">
        <Image src="/common/empty-avatar.svg" alt="No transaction" width={150} height={150} />
        <div className="text-2xl font-semibold text-center text-main-violet">No transaction</div>
        <div className="text-xl text-center text-grey-700">There is no transaction found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full h-full overflow-auto mt-8">
      {/* Select All Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="bg-grey-100 flex gap-2 items-center justify-center px-4 py-2 rounded-full cursor-pointer"
          >
            <span className="font-medium text-sm text-grey-800">Select all</span>
          </button>
          {selectedItems.size > 0 && <span className="text-text-secondary text-sm">{selectedItems.size} selected</span>}
        </div>
        {batchItems.length > 0 && (
          <span className="text-main-navy-blue text-sm font-medium">
            {batchItems.length} transaction{`${batchItems.length > 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* Batch Items List */}
      <div className="grid grid-cols-1 gap-2 w-full mt-2">
        {batchItems.map(item => {
          const isActive = activeItem === item.id;
          const isSelected = selectedItems.has(item.id);
          const isHighlighted = isSelected || isActive;

          const matchedContact = contacts.find(
            contact => contact.address.toLowerCase() === item.recipient.toLowerCase(),
          );

          return (
            <div
              key={item.id}
              className={`shadow-sm grid grid-cols-[auto_auto_1fr_auto_1fr_auto] gap-3 items-center px-6 py-4 w-full cursor-pointer rounded-xl transition-colors group ${
                isHighlighted ? "bg-main-violet" : "bg-white hover:bg-main-violet"
              }`}
              onClick={() => {
                onSelectItem(item.id);
              }}
            >
              {/* Checkbox */}
              <div onClick={e => e.stopPropagation()}>
                <CustomCheckbox checked={isSelected} onChange={() => onSelectItem(item.id)} />
              </div>

              {/* Transaction Type */}
              <div
                className={`text-sm font-medium w-[105px] ${isHighlighted ? "text-white" : "text-main-violet group-hover:text-white"}`}
              >
                Transfer
              </div>

              {/* Amount with Token */}
              <div
                className={`flex items-center gap-1 text-[16px] tracking-[-0.32px] ${isHighlighted ? "text-white" : "text-grey-950 group-hover:text-white"}`}
              >
                <Image
                  src={getTokenByAddress(item.tokenAddress).icon}
                  alt={getTokenByAddress(item.tokenAddress).symbol}
                  width={20}
                  height={20}
                />
                {formatAmount(item.amount, item.tokenAddress)}
              </div>

              {/* Arrow */}
              <Image
                src="/arrow/arrow-right.svg"
                className={`mr-3 transition-all ${isHighlighted ? "brightness-0 invert" : "group-hover:brightness-0 group-hover:invert"}`}
                alt="Arrow Right"
                width={100}
                height={100}
              />
              {/* Recipient */}
              {matchedContact ? (
                <AddressNamedTooltip address={item.recipient} name={matchedContact.name} isHighlighted={isHighlighted}>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium rounded-full w-fit pl-1 pr-4 py-1 max-w-32 ${
                      isHighlighted ? "bg-white text-black" : "bg-grey-100 text-black group-hover:bg-white"
                    }`}
                  >
                    <Image
                      src={"/new-account/default-avt.svg"}
                      alt="avatar"
                      width={16}
                      height={16}
                      className="flex-shrink-0"
                    />
                    <span className="truncate overflow-hidden">
                      <Fragment>
                        <span className="font-medium mr-0.5">{matchedContact.name}</span>
                        <span>{"(" + `${formatAddress(item?.recipient, { start: 3, end: 3 })}` + ")"}</span>
                      </Fragment>
                    </span>
                  </div>
                </AddressNamedTooltip>
              ) : (
                <span
                  className={`flex item-center gap-1 px-2 py-1 rounded-full w-fit text-xs font-medium ${
                    isHighlighted
                      ? "text-black bg-white"
                      : "text-black bg-grey-100 group-hover:bg-white group-hover:text-black"
                  }`}
                >
                  <Image src={"/new-account/default-avt.svg"} alt="avatar" width={16} height={16} />
                  <span> {formatAddress(item?.recipient, { start: 3, end: 3 })}</span>
                </span>
              )}
              <div className="flex items-center gap-2">
                <div>
                  <button
                    ref={editButtonRefs[item.id]}
                    onClick={e => {
                      e.stopPropagation();
                      setEditingItemId(item.id);
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg disabled:opacity-50 w-[95px] ${
                      isHighlighted ? "bg-white" : "bg-grey-100 group-hover:bg-white"
                    }`}
                  >
                    <Image src="/misc/edit-icon.svg" alt="Edit" width={16} height={16} />
                    <span className="font-medium text-[14px] text-center text-black">Edit</span>
                  </button>
                </div>

                {/* Remove Button */}
                <div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openModal("removeBatch", {
                        item,
                        onRemove: () => onRemove(item.id),
                      });
                    }}
                    disabled={isRemoving}
                    className="w-[95px] bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center gap-2 py-1.5 rounded-lg shadow-[0px_2px_4px_-1px_rgba(255,0,4,0.5),0px_0px_0px_1px_#ff6668] disabled:opacity-50"
                  >
                    <Image src="/misc/trash-icon.svg" alt="Remove" width={16} height={16} />
                    <span className="font-medium text-[14px] text-center text-white">Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Popover */}
      {editingItemId && editButtonRefs[editingItemId] && (
        <EditBatchPopover
          item={batchItems.find(item => item.id === editingItemId)!}
          isOpen={true}
          onClose={() => setEditingItemId(null)}
          onSave={data => {
            onEdit(editingItemId, data);
            setEditingItemId(null);
          }}
          triggerRef={editButtonRefs[editingItemId]}
        />
      )}
    </div>
  );
}

// ==================== Main Container ====================
export default function BatchContainer() {
  const { mutateAsync: deleteBatchItem, isPending: isRemoving } = useDeleteBatchItem();
  const { mutateAsync: updateBatchItem } = useUpdateBatchItem();
  const { data: batchItems = [], isLoading, refetch: refetchBatchItems } = useMyBatchItems();
  const { currentAccount } = useAccountStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isExiting] = useState(false);

  // Get accountId from current account
  const accountId = currentAccount?.id || null;

  const {
    proposeBatch,
    isLoading: isProposing,
    loadingState,
  } = useBatchTransaction({
    onSuccess: async () => {
      setSelectedItems(new Set());
      await refetchBatchItems();
    },
  });

  const handleSelectAll = () => {
    if (selectedItems.size === batchItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(batchItems.map((item: BatchItem) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Remove item handler
  const handleRemove = async (id: string) => {
    try {
      await deleteBatchItem(id);
      // Remove from selected if it was selected
      const newSelected = new Set(selectedItems);
      newSelected.delete(id);
      setSelectedItems(newSelected);
      // Clear active if it was active
      if (activeItem === id) {
        setActiveItem(null);
      }
      notification.success("Batch item removed successfully");
    } catch (error) {
      console.error("Failed to remove batch item:", error);
    }
  };

  const handleEdit = async (
    id: string,
    data: { recipient: string; amount: string; token: Token; contactId?: string },
  ) => {
    try {
      const amountInSmallestUnit = parseTokenAmount(data.amount, data.token.decimals);

      await updateBatchItem({
        id,
        data: {
          recipient: data.recipient,
          amount: amountInSmallestUnit,
          tokenAddress: data.token.address,
          contactId: data.contactId,
        },
      });

      notification.success("Batch item updated successfully");

      await refetchBatchItems();
    } catch (error) {
      console.error("Failed to update batch item:", error);
      notification.error("Failed to update batch item");
    }
  };

  // Propose batch transaction handler
  const handleProposeBatch = async () => {
    const selectedBatchItems = batchItems.filter(item => selectedItems.has(item.id));
    await proposeBatch(selectedBatchItems);
  };

  // Get selected batch items for summary
  const selectedBatchItems = batchItems.filter((item: BatchItem) => selectedItems.has(item.id));

  return (
    <div className="flex flex-row gap-1 w-full h-full bg-[#ECEDEC]">
      {/* Main Content */}
      <div
        className="py-5 px-8 bg-background rounded-lg flex flex-col flex-1 border-divider border-white border-2"
        style={{
          background: "rgba(255, 255, 255, 0.70)",
        }}
      >
        {/* Header */}
        <Header />

        {/* Batch Items List */}
        <BatchTransactions
          batchItems={batchItems}
          selectedItems={selectedItems}
          activeItem={activeItem}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          onRemove={handleRemove}
          onEdit={handleEdit}
          isLoading={isLoading}
          isRemoving={isRemoving}
          accountId={accountId}
        />
      </div>

      {/* Transaction Summary Sidebar */}
      {selectedItems.size > 0 && (
        <div className={`overflow-hidden ${isExiting ? "animate-slide-out" : "animate-slide-in"}`}>
          <TransactionSummary
            className="w-[500px]"
            transactions={selectedBatchItems.map(item => ({
              id: item.id,
              amount: formatAmount(item.amount, item.tokenAddress),
              recipient: item.recipient,
              contactName: item.contact?.name,
              tokenIcon: getTokenByAddress(item.tokenAddress).icon,
              tokenSymbol: getTokenByAddress(item.tokenAddress).symbol,
            }))}
            onConfirm={handleProposeBatch}
            isLoading={isProposing}
            loadingState={loadingState}
            accountId={accountId}
          />
        </div>
      )}
    </div>
  );
}
