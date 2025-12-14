import { useEffect, useState } from "react";
import { AddressGroup, Contact, UpdateContactDto } from "@polypay/shared";
import { Check, Copy, Edit2, Trash2, X } from "lucide-react";
import { useUpdateContact } from "~~/hooks";

interface ContactDetailProps {
  contact: Contact | null;
  groups: AddressGroup[];
  walletId: string;
  onDelete: (contact: Contact) => void;
  onUpdate: () => void;
}

export function ContactDetail({ contact, groups, walletId, onDelete, onUpdate }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const updateContact = useUpdateContact(walletId);

  useEffect(() => {
    if (contact) {
      setEditName(contact.name);
      setEditAddress(contact.address);
      setEditGroupIds(contact.groups?.map(g => g.group?.id ?? "") || []);
      setIsEditing(false);
    }
  }, [contact]);

  const handleCopy = () => {
    if (contact) {
      navigator.clipboard.writeText(contact.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!contact || editGroupIds.length === 0) return;

    const dto: UpdateContactDto = {};
    if (editName !== contact.name) dto.name = editName;
    if (editAddress !== contact.address) dto.address = editAddress;

    const currentGroupIds = contact.groups?.map(g => g.group?.id) || [];
    const groupsChanged =
      editGroupIds.length !== currentGroupIds.length || editGroupIds.some(id => !currentGroupIds.includes(id));
    if (groupsChanged) dto.groupIds = editGroupIds;

    if (Object.keys(dto).length > 0) {
      await updateContact.mutateAsync({ id: contact.id, dto });
      onUpdate();
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (contact) {
      setEditName(contact.name);
      setEditAddress(contact.address);
      setEditGroupIds(contact.groups?.map(g => g.group?.id ?? "") || []);
    }
    setIsEditing(false);
  };

  const toggleGroup = (groupId: string) => {
    setEditGroupIds(prev => (prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]));
  };

  if (!contact) {
    return (
      <div className="bg-base-200 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-base-content/40">Select a contact to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-sm text-base-content/60 uppercase">Contact Details</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
                <X size={16} />
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={updateContact.isPending || editGroupIds.length === 0}
              >
                {updateContact.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Check size={16} />
                )}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} />
              </button>
              <button className="btn btn-ghost btn-sm text-error" onClick={() => onDelete(contact)}>
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="text-sm text-base-content/60 block mb-2">Name</label>
          {isEditing ? (
            <input
              type="text"
              className="input input-bordered w-full"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
          ) : (
            <p className="text-lg font-medium">{contact.name}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="text-sm text-base-content/60 block mb-2">Address</label>
          {isEditing ? (
            <input
              type="text"
              className="input input-bordered w-full font-mono text-sm"
              value={editAddress}
              onChange={e => setEditAddress(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm break-all flex-1">{contact.address}</p>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
        </div>

        {/* Groups */}
        <div>
          <label className="text-sm text-base-content/60 block mb-2">Groups</label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <button
                  key={group.id}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    editGroupIds.includes(group.id)
                      ? "bg-primary text-primary-content"
                      : "bg-base-300 hover:bg-base-content/20"
                  }`}
                  onClick={() => toggleGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
              {editGroupIds.length === 0 && (
                <p className="text-error text-sm">Contact must belong to at least one group</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contact.groups?.map(({ group }) => (
                <span key={group?.id} className="px-3 py-1.5 bg-base-300 rounded-full text-sm">
                  {group?.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Created At */}
        <div>
          <label className="text-sm text-base-content/60 block mb-2">Created</label>
          <p className="text-sm">{new Date(contact.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
