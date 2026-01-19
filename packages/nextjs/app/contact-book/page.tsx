"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Contact, ContactGroup } from "@polypay/shared";
import { Search } from "lucide-react";
import { ContactList } from "~~/components/contact-book/ContactList";
import { EditContact } from "~~/components/contact-book/Editcontact";
import { modalManager } from "~~/components/modals/ModalLayout";
import { useContacts, useGroups } from "~~/hooks";
import { useAccountStore } from "~~/services/store";
import { formatAddress } from "~~/utils/format";

export default function AddressBookPage() {
  const router = useRouter();
  const { currentAccount: selectedAccount } = useAccountStore();
  const accountId = selectedAccount?.id || null;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    setEditing(false);
    setSearchTerm("");
    refetchContacts();
  };

  const handleGroupSuccess = () => {
    refetchGroups();
    refetchContacts();
  };

  const handleTransfer = () => {
    if (!selectedContact) return;
    // Store contact info in sessionStorage
    sessionStorage.setItem(
      "transferRecipient",
      JSON.stringify({
        address: selectedContact.address,
        name: selectedContact.name,
        contactId: selectedContact.id,
      }),
    );
    router.push("/transfer");
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
        <div className="container mx-auto p-6 h-full flex flex-col">
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
                  ref={searchInputRef}
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
                className="bg-grey-100 rounded-lg font-medium text-sm text-gray-700 transition-colors cursor-pointer w-28 h-12"
                onClick={() =>
                  modalManager.openModal?.("createGroup", {
                    accountId,
                    contacts,
                    onSuccess: handleGroupSuccess,
                  })
                }
              >
                New group
              </button>
              <button
                className="bg-main-violet text-white rounded-lg text-sm font-medium transition-colors cursor-pointer w-28 h-12"
                onClick={() =>
                  modalManager.openModal?.("createContact", {
                    accountId,
                    groups,
                    onSuccess: refetchContacts,
                  })
                }
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
        </div>
      </div>
      <div className="col-span-4 relative rounded-lg">
        {!editing && (
          <div>
            <div
              className="absolute inset-0 w-full rounded-t-lg z-10"
              style={{
                height: "40%",
                background: selectedContact
                  ? "linear-gradient(180deg, #FF7CEB 0%, #FFF 100%)"
                  : "linear-gradient(180deg, #BDBDBD 0%, #FFF 100%)",
              }}
            ></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
              <div className="w-6 h-64 bg-black py-8 flex flex-col items-center justify-between">
                {[0, 1, 2].map(index => (
                  <p key={index} className="text-white text-xs font-medium -rotate-90 max-w-16 truncate">
                    {selectedContact?.groups[0]?.group?.name || "PolyPay"}
                  </p>
                ))}
              </div>
              <div className={selectedContact ? "contact-card relative" : "contact-card-empty relative"}>
                {selectedContact && selectedContact.groups.length > 0 && (
                  <div className="bg-main-violet rounded-full px-4 py-1.5 absolute top-2 right-2 max-w-40">
                    <p className="text-white text-sm font-medium truncate whitespace-nowrap">
                      {selectedContact?.groups[0].group?.name}
                    </p>
                  </div>
                )}

                <div>
                  <Image
                    src={`/contact-book/${selectedContact ? "profile-contact.png" : "empty-profile-contact.png"}`}
                    alt="icon"
                    width={180}
                    height={140}
                    className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3"
                  />
                  {!selectedContact && (
                    <p className="text-grey-500 text-2xl text-center absolute bottom-10 left-1/2 transform -translate-x-1/2 w-full">
                      Select contact
                    </p>
                  )}
                </div>
                {selectedContact && (
                  <div className="absolute left-2 bottom-4">
                    <p className="text-2xl text-white mb-1 max-w-[200px] truncate">{selectedContact?.name}</p>
                    <div className="rounded-full py-0.5 px-1.5 bg-white w-fit">
                      <p className="text-xs font-medium text-main-navy-blue">
                        {formatAddress(selectedContact?.address ?? "", { start: 3, end: 3 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {selectedContact && (
              <div className="relative z-40 p-4">
                <div className="flex justify-end">
                  <button
                    className="px-6 py-2.5 rounded-xl bg-white w-fit text-main-black text-sm font-medium"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing && selectedContact && (
          <div className="flex flex-col h-full bg-white rounded-2xl">
            <EditContact
              contact={selectedContact}
              accountId={accountId}
              onSuccess={() => {
                refetchContacts();
              }}
              onDelete={() => {
                refetchContacts();
                setSelectedContact(null);
                setEditing(false);
              }}
              onClose={() => setEditing(false)}
            />
          </div>
        )}
        {selectedContact && !editing && (
          <div className="w-full px-5 bg-grey-50 absolute bottom-0 z-50 h-20 rounded-b-lg flex items-center justify-center border-t border-grey-200">
            <button className="h-12 px-6 rounded-xl font-medium bg-main-pink w-full" onClick={handleTransfer}>
              Transfer
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
