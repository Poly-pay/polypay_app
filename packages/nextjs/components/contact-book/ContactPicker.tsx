import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ContactBookUserIcon } from "../icons/ContactBookUserIcon";
import { Contact } from "@polypay/shared";
import { Search, X } from "lucide-react";
import { useContacts, useGroups } from "~~/hooks";

interface ContactPickerProps {
  accountId: string | null;
  onSelect: (address: string, name: string, contactId: string) => void;
  disabled?: boolean;
}

export function ContactPicker({ accountId, onSelect, disabled }: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: groups = [] } = useGroups(isOpen ? accountId : null);
  const { data: contacts = [], isLoading } = useContacts(isOpen ? accountId : null, selectedGroupId || undefined);

  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();

      const left = buttonRect.left - dropdownRect.width - 12;
      const top = buttonRect.top - 12;

      setPosition({ top, left });
    }
  }, [isOpen]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside: (event: MouseEvent) => void = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter contacts by search term
  const filteredContacts = contacts.filter(
    contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = (contact: Contact) => {
    onSelect(contact.address, contact.name, contact.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!accountId) return null;

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Select from contacts"
      >
        <ContactBookUserIcon width={20} height={20} className="text-gray-500" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed w-80 bg-white rounded-2xl shadow-lg border border-grey-100 z-50"
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
            className="absolute -right-7"
            style={{
              top: buttonRef.current ? `${16 + buttonRef.current.getBoundingClientRect().height / 2}px` : "32px",
              transform: "translateY(-50%)",
            }}
          />
          {/* Header */}
          <div className="p-3">
            <div className="flex items-center gap-2 border border-[#E2E2E2] bg-[#F8F7F7] rounded-xl pr-3 pl-1 py-1">
              <div
                className="flex items-center justify-center p-2 rounded-lg bg-white"
                style={{
                  boxShadow: "0 0 4px 0 rgba(18, 18, 18, 0.10)",
                }}
              >
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Enter contact name"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-0.5">
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Group tabs */}
          {groups.length > 0 && (
            <div className="flex gap-1 p-2 overflow-x-auto">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroupId === null ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    selectedGroupId === group.id ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}

          {/* Contact list */}
          <div className="max-h-64 overflow-y-auto overflow-x-hidden rounded-b-2xl">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-sm font-medium">{contact.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-sm truncate">{contact.name}</span>
                    {contact.groups && contact.groups.length > 0 && (
                      <span className="block text-xs text-gray-400 truncate">
                        {contact.groups
                          .map(entry => entry.group?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="block text-sm text-main-violet truncate">
                    {"[" + formatAddress(contact.address) + "]"}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchTerm ? "No contacts found" : "No contacts yet"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
