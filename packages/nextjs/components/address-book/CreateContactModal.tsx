import { useState } from "react";
import { AddressGroup } from "@polypay/shared";
import { X } from "lucide-react";
import { useCreateContact } from "~~/hooks";

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  groups: AddressGroup[];
}

export function CreateContactModal({
  isOpen,
  onClose,
  walletId,
  groups,
}: CreateContactModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const createContact = useCreateContact();

  const resetForm = () => {
    setName("");
    setAddress("");
    setSelectedGroupIds([]);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!address.trim()) {
      setError("Address is required");
      return;
    }

    if (selectedGroupIds.length === 0) {
      setError("Please select at least one group");
      return;
    }

    try {
      await createContact.mutateAsync({
        walletId,
        name: name.trim(),
        address: address.trim(),
        groupIds: selectedGroupIds,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">New Contact</h3>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter contact name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Address */}
            <div>
              <label className="label">
                <span className="label-text">Address</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono"
                placeholder="0x..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            {/* Groups */}
            <div>
              <label className="label">
                <span className="label-text">Groups</span>
              </label>
              {groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {groups.map(group => (
                    <button
                      key={group.id}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedGroupIds.includes(group.id)
                          ? "bg-primary text-primary-content"
                          : "bg-base-300 hover:bg-base-content/20"
                      }`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-base-content/50 text-sm">
                  No groups available. Please create a group first.
                </p>
              )}
            </div>

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
              disabled={createContact.isPending || groups.length === 0}
            >
              {createContact.isPending ? (
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
