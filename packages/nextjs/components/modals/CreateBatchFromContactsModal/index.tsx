"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StepAddToBatch } from "./StepAddToBatch";
import { StepChooseContact } from "./StepChooseContact";
import { StepTransactionSummary } from "./StepTransactionSummary";
import { StepUploadCsv } from "./StepUploadCsv";
import type { BatchContactEntry, Step } from "./types";
import { Contact, CreateBatchItemDto, ZERO_ADDRESS } from "@polypay/shared";
import { ArrowLeft, X } from "lucide-react";
import { parseUnits } from "viem";
import ModalContainer from "~~/components/modals/ModalContainer";
import { useBatchTransaction, useContacts, useCreateBatchItem, useGroups } from "~~/hooks";
import { useNetworkTokens } from "~~/hooks/app/useNetworkTokens";
import { parseBatchCsv } from "~~/utils/parseBatchCsv";
import { notification } from "~~/utils/scaffold-eth";

export type { BatchContactEntry } from "./types";

const PRIMARY_BUTTON_CLASS =
  "bg-main-pink rounded-lg font-medium text-sm h-9 w-full cursor-pointer disabled:opacity-40";

interface CreateBatchFromContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  mode?: "manual" | "csv";
  initialBatchItems?: BatchContactEntry[];
  [key: string]: any;
}

export default function CreateBatchFromContactsModal({
  isOpen,
  onClose,
  accountId,
  mode = "manual",
  initialBatchItems,
}: CreateBatchFromContactsModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [batchEntries, setBatchEntries] = useState<BatchContactEntry[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const hasAppliedInitialItems = useRef(false);

  const { data: contacts = [] } = useContacts(accountId || null, selectedGroupId || undefined);
  const { data: allContacts = [] } = useContacts(accountId || null);
  const { data: groups = [] } = useGroups(accountId || null);
  const { tokens, nativeEth, chainId } = useNetworkTokens();
  const { mutateAsync: createBatchItem } = useCreateBatchItem();
  const {
    proposeBatch,
    isLoading: isProposing,
    loadingState,
    loadingStep,
    totalSteps,
  } = useBatchTransaction({
    onSuccess: () => {
      handleReset();
      onClose();
    },
  });

  const defaultToken = nativeEth || tokens[0];

  // Skip to step 2 when initialBatchItems is provided (duplicate flow)
  useEffect(() => {
    if (isOpen && initialBatchItems && initialBatchItems.length > 0 && !hasAppliedInitialItems.current) {
      setBatchEntries(initialBatchItems);
      setStep(2);
      hasAppliedInitialItems.current = true;
    }
  }, [isOpen, initialBatchItems]);

  const handleReset = () => {
    setStep(1);
    setSelectedContactIds(new Set());
    setSelectedGroupId(null);
    setBatchEntries([]);
    setCsvFile(null);
    hasAppliedInitialItems.current = false;
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

  // CSV continue handler
  const handleCsvContinue = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (!text) return;

      const { validEntries, invalidCount } = parseBatchCsv(text, chainId);

      if (invalidCount > 0) {
        notification.error(`${invalidCount} row(s) skipped (invalid address, amount, or token)`);
      }

      if (validEntries.length === 0) {
        notification.error("No valid rows found");
        return;
      }

      const entries: BatchContactEntry[] = validEntries.map(entry => ({
        contact: {
          id: crypto.randomUUID(),
          name: "",
          address: entry.address,
          accountId: "",
          groups: [],
          createdAt: "",
          updatedAt: "",
        } as Contact,
        amount: entry.amount,
        tokenAddress: entry.tokenAddress,
        isSynthetic: true,
      }));

      setBatchEntries(entries);
      setStep(2);
    };
    reader.readAsText(csvFile);
  };

  // Back button logic
  const handleBack = () => {
    if (step === 2 && initialBatchItems && initialBatchItems.length > 0) {
      handleClose();
      return;
    }
    setStep((step - 1) as Step);
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
            contactId: entry.isSynthetic ? undefined : entry.contact.id,
          };
          return createBatchItem(dto);
        }),
      );
      await proposeBatch(createdItems);
    } catch {
      // Error is handled inside proposeBatch / createBatchItem
    }
  };

  const isCsvMode = mode === "csv";
  const title =
    step === 1 ? (isCsvMode ? "Upload CSV" : "Choose contact") : step === 2 ? "Add to batch" : "Transactions summary";

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      isCloseButton={false}
      className="w-[700px] bg-white p-0 !max-h-[85vh]"
      preventClose={isProposing}
      loadingTransaction={isProposing}
    >
      <div className="flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          {step > 1 ? (
            <button onClick={handleBack} className="p-2.5 rounded-lg cursor-pointer">
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
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {step === 1 &&
            (isCsvMode ? (
              <StepUploadCsv onFileReady={setCsvFile} onFileRemoved={() => setCsvFile(null)} />
            ) : (
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
            ))}

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
            {step === 1 &&
              (isCsvMode ? (
                <button onClick={handleCsvContinue} disabled={!csvFile} className={PRIMARY_BUTTON_CLASS}>
                  Continue
                </button>
              ) : (
                <button onClick={goToStep2} disabled={selectedContactIds.size === 0} className={PRIMARY_BUTTON_CLASS}>
                  Continue
                </button>
              ))}
            {step === 2 && (
              <button onClick={goToStep3} disabled={!allEntriesFilled} className={PRIMARY_BUTTON_CLASS}>
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
      </div>
    </ModalContainer>
  );
}
