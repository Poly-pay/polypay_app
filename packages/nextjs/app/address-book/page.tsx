"use client";

import { useState } from "react";
import { AddressGroup, Contact } from "@polypay/shared";
import { GroupList } from "~~/components/address-book/GroupList";
import { useContacts, useGroups } from "~~/hooks";
import { useWalletStore } from "~~/services/store";
import { ContactList } from "~~/components/address-book/ContactList";
import { ContactDetail } from "~~/components/address-book/ContactDetail";
import { CreateGroupModal } from "~~/components/address-book/CreateGroupModal";
import { CreateContactModal } from "~~/components/address-book/CreateContactModal";
import { DeleteConfirmModal } from "~~/components/address-book/DeleteConfirmModal";

export default function AddressBookPage() {
  const { currentWallet: selectedWallet } = useWalletStore();
  const walletId = selectedWallet?.id || null;

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "group" | "contact";
    id: string;
    name: string;
  } | null>(null);

  // Queries
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups(walletId);
  const { data: contacts = [], isLoading: isLoadingContacts } = useContacts(walletId, selectedGroupId || undefined);

  // Handlers
  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setSelectedContact(null);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleDeleteGroup = (group: AddressGroup) => {
    setDeleteTarget({ type: "group", id: group.id, name: group.name });
  };

  const handleDeleteContact = (contact: Contact) => {
    setDeleteTarget({ type: "contact", id: contact.id, name: contact.name });
  };

  const handleDeleteSuccess = () => {
    if (deleteTarget?.type === "contact" && selectedContact?.id === deleteTarget.id) {
      setSelectedContact(null);
    }
    if (deleteTarget?.type === "group" && selectedGroupId === deleteTarget.id) {
      setSelectedGroupId(null);
    }
    setDeleteTarget(null);
  };

  if (!walletId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-base-content/60">Please select a wallet first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Address Book</h1>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setIsCreateGroupOpen(true)}>
            + New Group
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateContactOpen(true)}>
            + New Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        {/* Sidebar - Groups */}
        <div className="col-span-3">
          <GroupList
            groups={groups}
            isLoading={isLoadingGroups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>

        {/* Main - Contacts */}
        <div className="col-span-5">
          <ContactList
            contacts={contacts}
            isLoading={isLoadingContacts}
            selectedContactId={selectedContact?.id || null}
            onSelectContact={handleSelectContact}
            selectedGroupName={selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : null}
          />
        </div>

        {/* Detail Panel */}
        <div className="col-span-4">
          <ContactDetail
            contact={selectedContact}
            groups={groups}
            walletId={walletId}
            onDelete={handleDeleteContact}
            onUpdate={() => setSelectedContact(null)}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        walletId={walletId}
        contacts={contacts}
      />

      <CreateContactModal
        isOpen={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
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
