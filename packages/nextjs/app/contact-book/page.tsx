"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Contact, ContactGroup } from "@polypay/shared";
import { Search } from "lucide-react";
import { ContactList } from "~~/components/contact-book/ContactList";
import { CreateContactModal } from "~~/components/contact-book/CreateContactModal";
import { CreateGroupModal } from "~~/components/contact-book/CreateGroupModal";
import { DeleteConfirmModal } from "~~/components/contact-book/DeleteConfirmModal";
import { useContacts, useGroups } from "~~/hooks";
import { useAccountStore } from "~~/services/store";

type DeleteTarget = {
  type: "group" | "contact";
  id: string;
  name: string;
};

export default function AddressBookPage() {
  const { currentAccount: selectedAccount } = useAccountStore();
  const accountId = selectedAccount?.id || null;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: groups = [], refetch: refetchGroups } = useGroups(accountId);
  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
    refetch: refetchContacts,
  } = useContacts(accountId, selectedGroupId || undefined);

  useEffect(() => {
    if (selectedContact) {
      const updatedContact = contacts.find(c => c.id === selectedContact.id);
      if (updatedContact && JSON.stringify(updatedContact) !== JSON.stringify(selectedContact)) {
        setSelectedContact(updatedContact);
      }
    }
  }, [contacts, selectedContact]);

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (contact: Contact) =>
          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.address.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [contacts, searchTerm],
  );

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setSelectedContact(null);
    refetchContacts();
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

  const handleGroupSuccess = () => {
    refetchGroups();
    refetchContacts();
  };

  if (!accountId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">Please select an account first</p>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-12 h-full gap-1">
      <div className="col-span-8 bg-[#FFFFFFB2] rounded-lg border-2 border-white shadow-2xl">
        <div className="container mx-auto p-6 h-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl text-main-black">Contact Book</h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center border border-[#E0E0E0] rounded-xl gap-3 p-2 mr-2">
                <div
                  className="p-2 rounded-lg bg-[#FCFCFC] flex items-center justify-center w-fit"
                  style={{
                    boxShadow: "0 0 4px 0 rgba(18, 18, 18, 0.10)",
                  }}
                >
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="focus:outline-none w-52"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
                <div
                  className="cursor-pointer max-h-6 flex items-center justify-center px-2 rounded-md border border-[#F1F1F1]"
                  style={{
                    boxShadow:
                      " 0 0 0 1px rgba(0, 0, 0, 0.11), 0 2px 0.8px 0 rgba(255, 255, 255, 0.27) inset, 0 -1px 0.6px 0 rgba(0, 0, 0, 0.20) inset, 0 1px 4.2px -1px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  <p className="font-medium text-grey-700 text-sm">⌘ K</p>
                </div>
              </div>
              <button
                className="bg-grey-100 rounded-lg font-medium text-sm text-gray-700 transition-colors cursor-pointer w-24 h-12"
                onClick={() => setIsCreateGroupOpen(true)}
              >
                New group
              </button>
              <button
                className="bg-main-violet text-white rounded-lg text-sm font-medium transition-colors cursor-pointer w-24 h-12"
                onClick={() => setIsCreateContactOpen(true)}
              >
                New contact
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => handleSelectGroup(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedGroupId === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {groups.map((group: ContactGroup) => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroupId === group.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          <ContactList
            contacts={filteredContacts}
            isLoading={isLoadingContacts}
            selectedContactId={selectedContact?.id || null}
            onSelectContact={setSelectedContact}
          />

          <CreateGroupModal
            isOpen={isCreateGroupOpen}
            onClose={() => setIsCreateGroupOpen(false)}
            onSuccess={handleGroupSuccess}
            accountId={accountId}
            contacts={contacts}
          />

          <CreateContactModal
            isOpen={isCreateContactOpen}
            onClose={() => setIsCreateContactOpen(false)}
            onSuccess={refetchContacts}
            accountId={accountId}
            groups={groups}
          />

          <DeleteConfirmModal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onSuccess={handleDeleteSuccess}
            target={deleteTarget}
            accountId={accountId}
          />
        </div>
      </div>
      <div className="col-span-4 relative rounded-lg">
        <div
          className="absolute inset-0 w-full rounded-t-lg z-10"
          style={{
            height: "40%",
            background: "linear-gradient(180deg, #FF7CEB 0%, #FFF 100%)",
          }}
        ></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="w-6 h-64 bg-black py-8 flex flex-col items-center justify-between">
            <p className="text-white text-xs font-medium -rotate-90">Apple</p>
            <p className="text-white text-xs font-medium -rotate-90">Apple</p>
            <p className="text-white text-xs font-medium -rotate-90">Apple</p>
          </div>
          <div className="contact-card relative">
            <div className="bg-main-violet rounded-full px-4 py-1.5 absolute top-2 right-2">
              <p className="text-white text-sm font-medium">Apple</p>
            </div>
            <Image
              src={"/contact-book/profile-contact.png"}
              alt="icon"
              width={180}
              height={140}
              className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3"
            />
            <div className="absolute left-2 bottom-4">
              <p className="text-2xl text-white mb-1">Olivia Chen</p>
              <div className="rounded-full py-0.5 px-1 bg-white w-fit">
                <p className="text-xs font-medium text-main-navy-blue">0xa...f23</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-40 p-2">
          <div className="flex justify-end">
            <div className="px-6 py-1.5 rounded-xl bg-white w-fit">
              <button className="text-main-black text-sm font-medium">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
