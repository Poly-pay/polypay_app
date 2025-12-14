import { useEffect, useRef, useState } from "react";
import { Contact } from "@polypay/shared";
import { BookUser, Search, X } from "lucide-react";
import { useContacts, useGroups } from "~~/hooks";

interface ContactPickerProps {
  walletId: string | null;
  onSelect: (address: string, name: string, contactId: string) => void;
  disabled?: boolean;
}

export function ContactPicker({ walletId, onSelect, disabled }: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: groups = [] } = useGroups(walletId);
  const { data: contacts = [], isLoading } = useContacts(walletId, selectedGroupId || undefined);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  if (!walletId) return null;

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Select from contacts"
      >
        <BookUser size={20} className="text-gray-500" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
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
            <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedGroupId === null ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                    selectedGroupId === group.id ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}

          {/* Contact list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm font-medium">{contact.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-gray-400 truncate">{formatAddress(contact.address)}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchTerm ? "No contacts found" : "No contacts yet"}
              </div>
            )}
          </div>

          {/* Footer link */}
          <div className="p-2 border-t border-gray-100">
            <a href="/address-book" className="block text-center text-xs text-primary hover:underline py-1">
              Manage Address Book →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
