import { useEffect, useMemo, useState } from "react";
import { Contact } from "@polypay/shared";
import { Search, X } from "lucide-react";
import { useCreateGroup } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { CreateGroupFormData, createGroupSchema } from "~~/lib/form";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  walletId: string;
  contacts: Contact[];
}

// Avatar colors for contacts
const avatarColors = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `[${address.slice(0, 4)}...${address.slice(-4)}]`;
}

function getContactGroups(contact: Contact): string {
  if (!contact.groups || contact.groups.length === 0) return "";
  return contact.groups
    .map(g => g.group?.name)
    .filter(Boolean)
    .join(", ");
}

export function CreateGroupModal({ isOpen, onClose, onSuccess, walletId, contacts }: CreateGroupModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const createGroup = useCreateGroup();

  const form = useZodForm({
    schema: createGroupSchema,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Filter contacts by search term
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

  const handleSubmit = async (data: CreateGroupFormData) => {
    setFormError("");

    try {
      await createGroup.mutateAsync({
        walletId,
        name: data.name.trim(),
        contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white" />
            </div>
            <h3 className="font-bold text-lg tracking-wide uppercase text-gray-800">New Group</h3>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={handleClose}>
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="p-5 space-y-5">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group name</label>
              <input
                {...form.register("name")}
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder="Enter group name"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Choose Contact */}
            {contacts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose contact</label>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    placeholder="Enter contact name"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Contact List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredContacts.map((contact, index) => {
                    const isSelected = selectedContactIds.includes(contact.id);
                    const groupNames = getContactGroups(contact);

                    return (
                      <div
                        key={contact.id}
                        className="flex items-center gap-1 p-1 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleContact(contact.id)}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#FF7CEB] border-[#FF7CEB]" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center flex-shrink-0`}
                        >
                          <span className="text-white font-semibold text-sm">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{contact.name}</p>
                          {groupNames && <p className="text-sm text-gray-500 truncate">{groupNames}</p>}
                        </div>

                        {/* Address */}
                        <span className="text-sm text-[#FF7CEB] font-medium flex-shrink-0">
                          {formatAddress(contact.address)}
                        </span>
                      </div>
                    );
                  })}

                  {filteredContacts.length === 0 && <p className="text-center text-gray-400 py-4">No contacts found</p>}
                </div>
              </div>
            )}

            {/* Error */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-red-600 text-sm">{formError}</span>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 p-5 border-t border-gray-100">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] px-6 py-3 bg-[#FF7CEB] text-white font-medium rounded-xl hover:bg-[#f35ddd] transition-colors disabled:opacity-50 cursor-pointer"
              disabled={createGroup.isPending}
            >
              {createGroup.isPending ? <span className="loading loading-spinner loading-sm" /> : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
