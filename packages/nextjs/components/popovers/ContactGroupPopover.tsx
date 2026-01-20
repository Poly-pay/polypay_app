"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Checkbox, SearchInput } from "../Common";
import { ContactGroup } from "@polypay/shared";
import { useContact, useGroups } from "~~/hooks/api/useContactBook";

interface ContactGroupPopoverProps {
  contactId: string;
  accountId: string | null;
  selectedGroup?: ContactGroup | null;
  selectedGroupIds?: string[];
  onSelect: (groupId: string) => void;
  arrowSrc?: string;
  arrowWidth?: number;
  arrowHeight?: number;
  pillClassName?: string;
  popoverClassName?: string;
  pillContent?: React.ReactNode;
}

export function ContactGroupPopover({
  contactId,
  accountId,
  selectedGroup,
  selectedGroupIds,
  onSelect,
  arrowSrc = "/batch/popover-arrow.svg",
  arrowWidth = 28,
  arrowHeight = 28,
  popoverClassName,
  pillContent,
}: ContactGroupPopoverProps) {
  const { data: contact, isLoading: isLoadingContact } = useContact(contactId);
  const { data: allGroups = [], isLoading: isLoadingGroups } = useGroups(accountId);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const contactGroupIds = selectedGroupIds || contact?.groups?.map(entry => entry.group?.id).filter(Boolean) || [];
  const isLoading = isLoadingContact || isLoadingGroups;

  const filteredGroups = allGroups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => setOpen(v => !v)}
        className="px-5 py-1.5 rounded-full absolute top-8 left-28 bg-white border border-main-pink cursor-pointer max-w-40"
        style={{
          boxShadow: "0 4px 24.5px 0 rgba(46, 119, 255, 0.25)",
        }}
      >
        {pillContent || (
          <>
            <p className="text-grey-950 font-medium text-sm truncate whitespace-nowrap">
              {selectedGroup?.name || "Select Group"}
            </p>
          </>
        )}
      </div>

      {open && (
        <div
          className={
            popoverClassName ?? "absolute  right-2/3 top-5 bg-white rounded-2xl border border-grey-200 shadow-lg z-20"
          }
        >
          <Image
            src={arrowSrc}
            alt="arrow"
            width={arrowWidth}
            height={arrowHeight}
            className="absolute -right-6 top-4"
          />

          <div className="w-[300px] px-2 py-3">
            <div>
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search group" variant="compact" />
            </div>
            {isLoading ? (
              <div className="px-3 py-4 text-center text-grey-800">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="px-3 py-4 text-center text-grey-800">
                {searchTerm ? "No groups found" : "No groups available"}
              </div>
            ) : (
              filteredGroups.map(group => {
                const isSelected = contactGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => {
                      onSelect(group.id);
                    }}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#FF7CEB1A] cursor-pointer rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-grey-800 text-xs">
                        {group.contacts?.length || 0} member{(group.contacts?.length || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Checkbox checked={isSelected} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
