"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox, FormButtons, ModalHeader, SearchInput } from "../Common";
import { Contact } from "@polypay/shared";
import ModalContainer from "~~/components/modals/ModalContainer";
import { useCreateGroup } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { createGroupSchema } from "~~/lib/form/schemas";
import { ModalProps } from "~~/types/modal";

interface CreateGroupModalProps extends ModalProps {
  onSuccess?: () => void;
  accountId?: string;
  contacts?: Contact[];
}

const avatarColors = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
];

const getAvatarColor = (index: number): string => avatarColors[index % avatarColors.length];

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `[${address.slice(0, 4)}...${address.slice(-4)}]`;
};

const getContactGroups = (contact: Contact): string => {
  if (!contact.groups || contact.groups.length === 0) return "";
  return contact.groups
    .map(g => g.group?.name)
    .filter(Boolean)
    .join(", ");
};

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  contacts = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const { mutateAsync: createGroup, isPending } = useCreateGroup();

  const form = useZodForm({
    schema: createGroupSchema,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter(
      contact => contact.name.toLowerCase().includes(term) || contact.address.toLowerCase().includes(term),
    );
  }, [contacts, searchTerm]);

  const resetForm = () => {
    form.reset();
    setSearchTerm("");
    setSelectedContactIds([]);
    setFormError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId],
    );
  };

  const onSubmit = form.handleSubmit(async data => {
    if (!accountId) {
      setFormError("Account ID is required");
      return;
    }

    try {
      await createGroup({
        accountId,
        name: data.name.trim(),
        contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create group");
    }
  });

  useEffect(() => {
    if (isOpen) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      isCloseButton={false}
      className="max-w-lg w-full bg-white p-0"
    >
      <ModalHeader title="New Group" iconSrc="/common/create-modal-icon.svg" onClose={handleClose} />

      <form onSubmit={onSubmit}>
        <div className="space-y-5 px-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group name</label>
            <input
              {...form.register("name")}
              type="text"
              className="w-full px-4 py-3 bg-grey-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="Enter group name"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          {contacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose contact</label>

              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Enter contact name"
                variant="compact"
              />

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredContacts.map((contact, index) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  const groupNames = getContactGroups(contact);

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center gap-2 py-1 px-2.5 rounded-xl cursor-pointer hover:bg-[#FF7CEB1A] transition-colors"
                      onClick={() => toggleContact(contact.id)}
                    >
                      <Checkbox checked={isSelected} />

                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-semibold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{contact.name}</p>
                        {groupNames && <p className="text-sm text-gray-500 truncate">{groupNames}</p>}
                      </div>

                      <span className="text-sm text-main-violet font-medium flex-shrink-0">
                        {formatAddress(contact.address)}
                      </span>
                    </div>
                  );
                })}

                {filteredContacts.length === 0 && <p className="text-center text-gray-400 py-4">No contacts found</p>}
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-red-600 text-sm">{formError}</span>
            </div>
          )}
        </div>

        <FormButtons onCancel={handleClose} isLoading={isPending} submitText="Create group" />
      </form>
    </ModalContainer>
  );
};

export default CreateGroupModal;
