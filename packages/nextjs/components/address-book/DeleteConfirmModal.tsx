import { AlertTriangle, X } from "lucide-react";
import { useDeleteContact, useDeleteGroup } from "~~/hooks";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: {
    type: "group" | "contact";
    id: string;
    name: string;
  } | null;
  walletId: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onSuccess, target, walletId }: DeleteConfirmModalProps) {
  const deleteGroup = useDeleteGroup(walletId);
  const deleteContact = useDeleteContact(walletId);

  const isPending = deleteGroup.isPending || deleteContact.isPending;

  const handleDelete = async () => {
    if (!target) return;

    try {
      if (target.type === "group") {
        await deleteGroup.mutateAsync(target.id);
      } else {
        await deleteContact.mutateAsync(target.id);
      }
      onSuccess();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!isOpen || !target) return null;

  return (
    <div className="modal modal-open ">
      <div className="modal-box bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Confirm Delete</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <AlertTriangle className="text-error" size={32} />
          </div>
          <p className="text-lg mb-2">
            Delete {target.type === "group" ? "group" : "contact"}{" "}
            <span className="font-semibold">"{target.name}"</span>?
          </p>
          <p className="text-base-content/60 text-sm">
            {target.type === "group"
              ? "This will remove the group. Contacts in this group will not be deleted."
              : "This action cannot be undone."}
          </p>
        </div>

        <div className="modal-action justify-center">
          <button className="btn btn-ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={handleDelete} disabled={isPending}>
            {isPending ? <span className="loading loading-spinner loading-sm" /> : "Delete"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
