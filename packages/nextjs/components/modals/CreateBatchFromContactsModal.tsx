"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Contact, ContactGroup, CreateBatchItemDto, ZERO_ADDRESS } from "@polypay/shared";
import { ArrowLeft, GripVertical, X } from "lucide-react";
import { parseUnits } from "viem";
import { Checkbox } from "~~/components/Common";
import ModalContainer from "~~/components/modals/ModalContainer";
import { TokenPillPopover } from "~~/components/popovers/TokenPillPopover";
import { useContacts, useCreateBatchItem, useGroups } from "~~/hooks";
import { useBatchTransaction } from "~~/hooks";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { formatAddress } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";

interface BatchContactEntry {
  contact: Contact;
  amount: string;
  tokenAddress: string;
}

interface CreateBatchFromContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  [key: string]: any;
}

type Step = 1 | 2 | 3;

export default function CreateBatchFromContactsModal({
  isOpen,
  onClose,
  accountId,
}: CreateBatchFromContactsModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [batchEntries, setBatchEntries] = useState<BatchContactEntry[]>([]);

  const { data: contacts = [] } = useContacts(accountId || null, selectedGroupId || undefined);
  const { data: allContacts = [] } = useContacts(accountId || null);
  const { data: groups = [] } = useGroups(accountId || null);
  const { tokens, nativeEth } = useNetworkTokens();
  const { mutateAsync: createBatchItem } = useCreateBatchItem();
  const {
    proposeBatch,
    isLoading: isProposing,
    loadingState,
    loadingStep,
    totalSteps,
  } = useBatchTransaction({
    onSuccess: () => {
      notification.success("Batch transaction created!");
      handleReset();
      onClose();
    },
  });

  const defaultToken = nativeEth || tokens[0];

  const handleReset = () => {
    setStep(1);
    setSelectedContactIds(new Set());
    setSelectedGroupId(null);
    setBatchEntries([]);
  };

  const handleClose = () => {
    if (isProposing) return;
    handleReset();
    onClose();
  };

  // Step 1: Contact Selection
  const toggleContact = useCallback((contactId: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedContactIds.size === contacts.length && contacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contacts.map(c => c.id)));
    }
  }, [selectedContactIds.size, contacts]);

  const allSelected = contacts.length > 0 && selectedContactIds.size === contacts.length;

  const goToStep2 = () => {
    const selectedContacts = allContacts.filter(c => selectedContactIds.has(c.id));
    setBatchEntries(
      selectedContacts.map(contact => ({
        contact,
        amount: "",
        tokenAddress: defaultToken?.address || ZERO_ADDRESS,
      })),
    );
    setStep(2);
  };

  // Step 2: Amount & Token
  const updateEntryAmount = (index: number, amount: string) => {
    setBatchEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, amount } : entry)));
  };

  const updateEntryToken = (index: number, tokenAddress: string) => {
    setBatchEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, tokenAddress } : entry)));
  };

  const removeEntry = (index: number) => {
    setBatchEntries(prev => prev.filter((_, i) => i !== index));
  };

  const allEntriesFilled = batchEntries.length > 0 && batchEntries.every(e => e.amount && parseFloat(e.amount) > 0);

  const goToStep3 = () => {
    setStep(3);
  };

  // Step 3: Execute
  const resolveToken = (tokenAddress: string) => {
    return tokens.find(t => t.address === tokenAddress) || defaultToken;
  };

  const handleProposeBatch = async () => {
    try {
      const createdItems = await Promise.all(
        batchEntries.map(entry => {
          const token = resolveToken(entry.tokenAddress);
          const amountInSmallestUnit = parseUnits(entry.amount, token.decimals).toString();

          const dto: CreateBatchItemDto = {
            recipient: entry.contact.address,
            amount: amountInSmallestUnit,
            tokenAddress: entry.tokenAddress === ZERO_ADDRESS ? undefined : entry.tokenAddress,
            contactId: entry.contact.id,
          };
          return createBatchItem(dto);
        }),
      );
      await proposeBatch(createdItems);
    } catch {
      // Error is handled inside proposeBatch / createBatchItem
    }
  };

  const title = step === 1 ? "Choose contact" : step === 2 ? "Add to batch" : "Transactions summary";

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      isCloseButton={false}
      className="w-[700px] bg-white p-0 flex flex-col max-h-[85vh]"
      preventClose={isProposing}
      loadingTransaction={isProposing}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        {step > 1 ? (
          <button onClick={() => setStep((step - 1) as Step)} className="p-2.5 rounded-lg cursor-pointer">
            <ArrowLeft size={24} />
          </button>
        ) : (
          <div className="w-11" />
        )}
        <p className="font-semibold text-xl uppercase tracking-tight">{title}</p>
        <button onClick={handleClose} className="p-2.5 rounded-lg border border-grey-200 cursor-pointer">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {step === 1 && (
          <StepChooseContact
            contacts={contacts}
            groups={groups}
            selectedGroupId={selectedGroupId}
            selectedContactIds={selectedContactIds}
            onSelectGroup={setSelectedGroupId}
            onToggleContact={toggleContact}
            onSelectAll={handleSelectAll}
            allSelected={allSelected}
          />
        )}

        {step === 2 && (
          <StepAddToBatch
            entries={batchEntries}
            resolveToken={resolveToken}
            onUpdateAmount={updateEntryAmount}
            onUpdateToken={updateEntryToken}
            onRemove={removeEntry}
          />
        )}

        {step === 3 && <StepTransactionSummary entries={batchEntries} resolveToken={resolveToken} />}
      </div>

      {/* Footer */}
      <div className="bg-grey-50 border-t border-grey-200 flex gap-2 items-center px-5 py-4 shrink-0">
        <button
          onClick={handleClose}
          className="bg-grey-100 rounded-lg font-medium text-sm h-9 w-[90px] cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex-1">
          {step === 1 && (
            <button
              onClick={goToStep2}
              disabled={selectedContactIds.size === 0}
              className="bg-main-pink rounded-lg font-medium text-sm h-9 w-full cursor-pointer disabled:opacity-40"
            >
              Continue
            </button>
          )}
          {step === 2 && (
            <button
              onClick={goToStep3}
              disabled={!allEntriesFilled}
              className="bg-main-pink rounded-lg font-medium text-sm h-9 w-full cursor-pointer disabled:opacity-40"
            >
              Review
            </button>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-2">
              {isProposing && loadingState && loadingStep > 0 && (
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="text-xs text-gray-500">
                    Step {loadingStep} of {totalSteps} — {loadingState}
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(loadingStep / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleProposeBatch}
                disabled={isProposing}
                className="bg-main-pink rounded-lg font-medium text-sm h-9 w-full cursor-pointer disabled:opacity-50"
              >
                {isProposing ? loadingState || "Processing..." : "Propose batch"}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalContainer>
  );
}

// --- Step 1: Choose Contact ---
function StepChooseContact({
  contacts,
  groups,
  selectedGroupId,
  selectedContactIds,
  onSelectGroup,
  onToggleContact,
  onSelectAll,
  allSelected,
}: {
  contacts: Contact[];
  groups: ContactGroup[];
  selectedGroupId: string | null;
  selectedContactIds: Set<string>;
  onSelectGroup: (id: string | null) => void;
  onToggleContact: (id: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Group filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => onSelectGroup(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
            selectedGroupId === null
              ? "bg-main-pink text-white"
              : "bg-white text-grey-800 shadow-[0px_0px_11px_0px_rgba(0,0,0,0.12)]"
          }`}
        >
          All
        </button>
        {groups.map((group: ContactGroup) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedGroupId === group.id
                ? "bg-main-pink text-white"
                : "bg-white text-grey-800 shadow-[0px_0px_11px_0px_rgba(0,0,0,0.12)]"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Select all / count */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSelectAll}
          className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            allSelected ? "bg-main-black text-white" : "bg-grey-100 text-grey-800"
          }`}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-sm font-medium text-grey-800">{selectedContactIds.size} selected</span>
      </div>

      {/* Contact list */}
      <div className="flex flex-col gap-0.5">
        {contacts.map((contact: Contact) => {
          const isSelected = selectedContactIds.has(contact.id);
          return (
            <div
              key={contact.id}
              className={`flex items-center justify-between px-6 py-3 rounded-lg transition-colors ${
                isSelected ? "bg-main-violet" : "bg-white border-b border-grey-100"
              }`}
            >
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => onToggleContact(contact.id)}>
                <Checkbox checked={isSelected} />
                <Image src="/avatars/default-avt.svg" alt="avatar" width={24} height={24} className="rounded-full" />
                <span className={`font-medium ${isSelected ? "text-white" : "text-grey-950"}`}>{contact.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-1.5 py-1 rounded-full ${
                    isSelected ? "bg-main-black text-white" : "bg-main-navy-blue text-white"
                  }`}
                >
                  {formatAddress(contact.address, { start: 4, end: 4 })}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(contact.address);
                    notification.success("Address copied!");
                  }}
                  className="cursor-pointer"
                >
                  <Image src="/contact-book/copy-icon.svg" alt="copy" width={16} height={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Step 2: Add to Batch ---
function StepAddToBatch({
  entries,
  resolveToken,
  onUpdateAmount,
  onUpdateToken,
  onRemove,
}: {
  entries: BatchContactEntry[];
  resolveToken: (address: string) => any;
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
                <span className="font-medium text-grey-950">{entry.contact.name}</span>
                <span className="text-sm text-grey-500">
                  {formatAddress(entry.contact.address, { start: 4, end: 4 })}
                </span>
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

// --- Step 3: Transaction Summary ---
function StepTransactionSummary({
  entries,
  resolveToken,
}: {
  entries: BatchContactEntry[];
  resolveToken: (address: string) => any;
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
