"use client";

import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { Contact } from "@polypay/shared";
import { X } from "lucide-react";
import { useDeleteContact } from "~~/hooks";
import { formatAddress } from "~~/utils/format";

interface DeleteContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  selectedContact?: Contact | null;
  accountId?: string;
  onSuccess?: () => void;
}

const DeleteContactModal = ({
  isOpen,
  onClose,
  onAfterClose,
  selectedContact,
  accountId,
  onSuccess,
}: DeleteContactModalProps) => {
  const deleteContact = useDeleteContact(accountId || "");
  const isPending = deleteContact.isPending;

  const handleDelete = async () => {
    if (!selectedContact || !accountId) return;

    try {
      await deleteContact.mutateAsync(selectedContact.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Delete contact failed:", err);
    }
  };

  if (!selectedContact) return null;

  const formattedAddress = formatAddress(selectedContact.address);

  return (
    <ModalContainer
      isOpen={isOpen}
      isCloseButton={false}
      onClose={onClose}
      onAfterClose={onAfterClose}
      className="max-w-lg bg-white p-0"
      loadingTransaction={isPending}
      preventClose={isPending}
    >
      <div className="flex items-center gap-3 p-5">
        <Image src={"/contact-book/remove-modal-icon.svg"} alt="icon" width={36} height={36} />
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h3 className="uppercase text-lg font-medium text-grey-950">CONFIRMATION</h3>
            <p className="text-sm text-red-500">
              Delete <span className="text-blue-500">[{selectedContact.name}]</span>
            </p>
          </div>
          <X
            width={18}
            height={18}
            onClick={!isPending ? onClose : undefined}
            className={`cursor-pointer ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>
      </div>
      <div className="flex flex-col justify-center items-center gap-4 py-6 px-3">
        <Image src={"/contact-book/remove-contact.png"} width={200} height={200} alt="remove-contact" />
        <div className="flex items-center justify-between gap-2 w-60 rounded-full px-3 py-1.5 bg-red-50 border border-red-500">
          <p className="text-sm truncate">{selectedContact.name}</p>
          <p className="bg-red-500 text-sm px-2 py-1 rounded-full text-white">{formattedAddress}</p>
        </div>
        <p className="text-center text-xl font-medium text-red-500">
          Are you sure you want to delete this address from your contact list?
        </p>
      </div>
      <div className="flex items-center gap-3 bg-grey-50 border-t border-grey-200 px-5 py-4 rounded-b-3xl">
        <button
          className="bg-grey-100 w-full max-w-[90px] h-10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          className="text-white bg-red-500 h-10 rounded-lg w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? <span className="loading loading-spinner loading-sm" /> : "Delete"}
        </button>
      </div>
    </ModalContainer>
  );
};

export default DeleteContactModal;
