"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ContactGroupPopover } from "../popovers/ContactGroupPopover";
import { Contact, ContactGroup, UpdateContactDto } from "@polypay/shared";
import { useModalApp, useUpdateContact } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { createContactSchema } from "~~/lib/form/schemas";
import { notification } from "~~/utils/scaffold-eth";

interface EditContactProps {
  contact: Contact;
  groups?: ContactGroup[];
  accountId?: string;
  onSuccess?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export const EditContact = ({ contact, accountId, onSuccess, onDelete, onClose }: EditContactProps) => {
  const { openModal } = useModalApp();

  const finalAccountId = accountId || contact?.accountId;
  const updateContact = useUpdateContact(finalAccountId || "");

  const form = useZodForm({
    schema: createContactSchema,
    defaultValues: {
      name: contact.name || "",
      address: contact.address || "",
      groupIds: contact.groups?.map(g => g?.group?.id || "").filter(Boolean) || [],
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        address: contact.address,
        groupIds: contact.groups?.map(g => g?.group?.id || "").filter(Boolean) || [],
      });
    }
  }, [contact, form]);

  const onSubmit = form.handleSubmit(async data => {
    if (!contact || !finalAccountId) {
      return;
    }

    const dto: UpdateContactDto = {};
    if (data.name !== contact.name) dto.name = data.name.trim();
    if (data.address !== contact.address) dto.address = data.address.trim();

    const currentGroupIds = contact.groups?.map(g => g?.group?.id || "").filter(Boolean) || [];
    const newGroupIds = data.groupIds || [];
    const groupsChanged =
      newGroupIds.length !== currentGroupIds.length || newGroupIds.some(id => !currentGroupIds.includes(id));
    if (groupsChanged) dto.groupIds = newGroupIds;

    if (Object.keys(dto).length > 0) {
      try {
        await updateContact.mutateAsync({ id: contact.id, dto });
        notification.success("Contact updated successfully");
        onSuccess?.();
        onClose?.();
      } catch (error) {
        console.error("Failed to update contact:", error);
        notification.error(error instanceof Error ? error.message : "Failed to update contact");
      }
    } else {
      console.log("No changes detected");
    }
  });

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-3 flex-1 h-full flex flex-col justify-center p-6">
        <h3 className="text-center uppercase font-semibold">Edit contact</h3>
        <p className="text-grey-500 text-sm text-center w-full">
          Update names, category for each wallet address in your list, making it easier to identify and manage your
          crypto wallets conveniently, securely that suits your personal needs.
        </p>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-12 items-center gap-3 relative">
            <div className="col-span-4">
              <div>
                <input
                  {...form.register("name")}
                  type="text"
                  className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                  placeholder="Name"
                />
              </div>
              <div>
                <Image
                  src="/contact-book/link-group.png"
                  alt="icon"
                  width={92}
                  height={92}
                  className="absolute top-12 left-4"
                />
                <p className="text-sm text-grey-500 absolute top-16 left-10">From</p>
                <ContactGroupPopover
                  contactId={contact.id}
                  accountId={contact.accountId || null}
                  selectedGroup={contact?.groups[0]?.group || null}
                  selectedGroupIds={form.watch("groupIds")}
                  onSelect={groupId => {
                    const currentGroupIds = form.getValues("groupIds") || [];
                    const newGroupIds = currentGroupIds.includes(groupId)
                      ? currentGroupIds.filter(id => id !== groupId)
                      : [...currentGroupIds, groupId];
                    form.setValue("groupIds", newGroupIds, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
            <div className="col-span-8">
              <input
                {...form.register("address")}
                type="text"
                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                placeholder="0xF1E2d3c4B5A67890FEDCBA98765432..."
              />
            </div>
          </div>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-grey-200 bg-grey-50 p-6 rounded-b-lg">
        <button
          onClick={() =>
            openModal("deleteContact", {
              selectedContact: contact,
              accountId: finalAccountId,
              onSuccess: () => {
                notification.success("Contact deleted successfully");
                onDelete?.();
              },
            })
          }
          className="py-3 px-6 rounded-lg text-white bg-red-500 font-medium"
        >
          Delete contact
        </button>
        <button
          type="submit"
          onClick={onSubmit}
          disabled={updateContact.isPending}
          className="py-3 px-6 rounded-lg bg-main-pink font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateContact.isPending ? <span className="loading loading-spinner loading-sm" /> : "Save changes"}
        </button>
      </div>
    </div>
  );
};
