import { useState } from "react";
import { Contact } from "@polypay/shared";
import { X, Check } from "lucide-react";
import { useCreateGroup } from "~~/hooks";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  contacts: Contact[];
}

export function CreateGroupModal({
  isOpen,
  onClose,
  walletId,
  contacts,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const createGroup = useCreateGroup();

  const resetForm = () => {
    setName("");
    setSelectedContactIds([]);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    try {
      await createGroup.mutateAsync({
        walletId,
        name: name.trim(),
        contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">New Group</h3>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter group name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Contacts (optional) */}
            {contacts.length > 0 && (
              <div>
                <label className="label">
                  <span className="label-text">Add Contacts (optional)</span>
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {contacts.map(contact => (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedContactIds.includes(contact.id)
                          ? "bg-primary/10 border border-primary"
                          : "bg-base-300 hover:bg-base-content/10"
                      }`}
                      onClick={() => toggleContact(contact.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedContactIds.includes(contact.id)
                            ? "bg-primary border-primary"
                            : "border-base-content/30"
                        }`}
                      >
                        {selectedContactIds.includes(contact.id) && (
                          <Check size={14} className="text-primary-content" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.name}</p>
                        <p className="text-sm text-base-content/50 truncate">
                          {contact.address.slice(0, 10)}...{contact.address.slice(-8)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createGroup.isPending}
            >
              {createGroup.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}
