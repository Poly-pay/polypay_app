"use client";

import Image from "next/image";
import { Contact, ContactGroup } from "@polypay/shared";
import { Checkbox } from "~~/components/Common";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";

export function StepChooseContact({
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
                    copyToClipboard(contact.address, "Address copied!");
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
