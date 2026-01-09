"use client";

import { useEffect, useState } from "react";
import { Contact } from "@polypay/shared";
import { Search } from "lucide-react";
import { ContactDetail } from "~~/components/address-book/ContactDetail";
import { ContactList } from "~~/components/address-book/ContactList";
import { CreateContactModal } from "~~/components/address-book/CreateContactModal";
import { CreateGroupModal } from "~~/components/address-book/CreateGroupModal";
import { DeleteConfirmModal } from "~~/components/address-book/DeleteConfirmModal";
import { useContacts, useGroups } from "~~/hooks";
import { useWalletStore } from "~~/services/store";

export default function AddressBookPage() {
  const { currentWallet: selectedWallet } = useWalletStore();
  const walletId = selectedWallet?.id || null;

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "group" | "contact";
    id: string;
    name: string;
  } | null>(null);

  // Queries
  const { data: groups = [], refetch: refetchGroups } = useGroups(walletId);
  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
    refetch: refetchContacts,
  } = useContacts(walletId, selectedGroupId || undefined);

  // Auto sync selectedContact when contacts data updates
  useEffect(() => {
    if (selectedContact) {
      const updatedContact = contacts.find(c => c.id === selectedContact.id);
      if (updatedContact && JSON.stringify(updatedContact) !== JSON.stringify(selectedContact)) {
        setSelectedContact(updatedContact);
      }
    }
  }, [contacts, selectedContact]);

  // Filter contacts by search
  const filteredContacts = contacts.filter(
    contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handlers
  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setSelectedContact(null);
    refetchContacts();
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleDeleteContact = (contact: Contact) => {
    setDeleteTarget({ type: "contact", id: contact.id, name: contact.name });
  };

  const handleDeleteSuccess = () => {
    if (deleteTarget?.type === "contact") {
      refetchContacts();
      if (selectedContact?.id === deleteTarget.id) {
        setSelectedContact(null);
      }
    } else if (deleteTarget?.type === "group") {
      refetchGroups();
      refetchContacts();
    }
    setDeleteTarget(null);
  };

  if (!walletId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">Please select a wallet first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Address Book</h1>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Enter name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-48"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setIsCreateGroupOpen(true)}
          >
            New group
          </button>
          <button
            className="px-4 py-2 bg-pink-350 text-white rounded-lg font-medium hover:bg-pink-450 transition-colors cursor-pointer"
            onClick={() => setIsCreateContactOpen(true)}
          >
            New contact
          </button>
        </div>
      </div>

      {/* Group Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => handleSelectGroup(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            selectedGroupId === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => handleSelectGroup(group.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedGroupId === group.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Contact List */}
        <div className="flex-1">
          <ContactList
            contacts={filteredContacts}
            isLoading={isLoadingContacts}
            selectedContactId={selectedContact?.id || null}
            onSelectContact={handleSelectContact}
          />
        </div>

        {/* Contact Detail Panel */}
        {selectedContact && (
          <div className="w-96">
            <ContactDetail
              contact={selectedContact}
              groups={groups}
              walletId={walletId}
              onDelete={handleDeleteContact}
              onUpdate={() => setSelectedContact(null)}
              onSuccess={async () => {
                await Promise.all([refetchGroups(), refetchContacts()]);
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={() => {
          refetchGroups();
          refetchContacts();
        }}
        walletId={walletId}
        contacts={contacts}
      />

      <CreateContactModal
        isOpen={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        onSuccess={refetchContacts}
        walletId={walletId}
        groups={groups}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={handleDeleteSuccess}
        target={deleteTarget}
        walletId={walletId}
      />
    </div>
  );
}
