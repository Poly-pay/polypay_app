import { useEffect, useState } from "react";
import { AddressGroup, Contact, UpdateContactDto } from "@polypay/shared";
import { Check, Copy, Trash2 } from "lucide-react";
import { useUpdateContact } from "~~/hooks";
import { notification } from "~~/utils/scaffold-eth";

interface ContactDetailProps {
  contact: Contact | null;
  groups: AddressGroup[];
  walletId: string;
  onDelete: (contact: Contact) => void;
  onUpdate: () => void;
  onSuccess?: () => void;
}

export function ContactDetail({ contact, groups, walletId, onDelete, onUpdate, onSuccess }: ContactDetailProps) {
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateContact = useUpdateContact(walletId);

  useEffect(() => {
    if (contact) {
      setEditName(contact.name);
      setEditAddress(contact.address);
      setEditGroupIds(contact.groups?.map(g => g?.group?.id || "") || []);
      setHasChanges(false);
    }
  }, [contact]);

  // Check for changes
  useEffect(() => {
    if (!contact) return;

    const nameChanged = editName !== contact.name;
    const addressChanged = editAddress !== contact.address;
    const currentGroupIds = contact.groups?.map(g => g?.group?.id || "") || [];
    const groupsChanged =
      editGroupIds.length !== currentGroupIds.length || editGroupIds.some(id => !currentGroupIds.includes(id));

    setHasChanges(nameChanged || addressChanged || groupsChanged);
  }, [editName, editAddress, editGroupIds, contact]);

  const handleCopy = () => {
    if (contact) {
      navigator.clipboard.writeText(contact.address);
      notification.success("Address copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!contact || editGroupIds.length === 0) return;

    const dto: UpdateContactDto = {};
    if (editName !== contact.name) dto.name = editName;
    if (editAddress !== contact.address) dto.address = editAddress;

    const currentGroupIds = contact.groups?.map(g => g?.group?.id || "") || [];
    const groupsChanged =
      editGroupIds.length !== currentGroupIds.length || editGroupIds.some(id => !currentGroupIds.includes(id));
    if (groupsChanged) dto.groupIds = editGroupIds;

    if (Object.keys(dto).length > 0) {
      try {
        await updateContact.mutateAsync({ id: contact.id, dto });
        notification.success("Contact updated successfully");
        setHasChanges(false);
        onSuccess?.();
        onUpdate();
      } catch (error) {
        console.error("Failed to update contact:", error);
        notification.error(error instanceof Error ? error.message : "Failed to update contact");
        return;
      }
    }
  };

  const toggleGroup = (groupId: string) => {
    setEditGroupIds(prev => (prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]));
  };

  if (!contact) {
    return null;
  }

  return (
    <div className="bg-[#EDEDED] rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-sm tracking-wide uppercase text-gray-500">Edit Contact</h2>
        <p className="text-xs text-gray-400 mt-1">Update names, category for each wallet address in your list</p>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Name & Address */}
        <div className="flex gap-3">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-1/3  px-2 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            placeholder="Name"
          />
          <div className="w-2/3 relative">
            <input
              type="text"
              value={editAddress}
              onChange={e => setEditAddress(e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
              placeholder="0x..."
            />
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Groups */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">From</label>
          <div className="flex flex-wrap gap-2">
            {groups.map(group => {
              const isSelected = editGroupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                  }`}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-3 p-5 border-t border-gray-100">
        <button
          onClick={() => onDelete(contact)}
          className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Trash2 size={16} />
          Delete contact
        </button>
        <button
          onClick={handleSave}
          disabled={updateContact.isPending || !hasChanges || editGroupIds.length === 0}
          className="flex-1 px-4 py-3 bg-[#FF7CEB] text-white font-medium rounded-xl hover:bg-[#f35ddd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {updateContact.isPending ? <span className="loading loading-spinner loading-sm" /> : "Save changes"}
        </button>
      </div>
    </div>
  );
}
