"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox, ModalHeader, SearchInput } from "../Common";
import { ContactGroup } from "@polypay/shared";
import ModalContainer from "~~/components/modals/ModalContainer";
import { useCreateContact } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { createContactSchema } from "~~/lib/form/schemas";
import { ModalProps } from "~~/types/modal";

interface CreateContactModalProps extends ModalProps {
  onSuccess?: () => void;
  accountId?: string;
  groups?: ContactGroup[];
}

const getMemberCount = (group: ContactGroup): number => {
  return group.contacts?.length || 0;
};

const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  groups = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [formError, setFormError] = useState("");

  const { mutateAsync: createContact, isPending } = useCreateContact();

  const form = useZodForm({
    schema: createContactSchema,
    defaultValues: {
      name: "",
      address: "",
      groupIds: [],
    },
  });

  const selectedGroupIds = form.watch("groupIds");

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(group => group.name.toLowerCase().includes(term));
  }, [groups, searchTerm]);

  const safeSelectedGroupIds = selectedGroupIds || [];

  const resetForm = () => {
    form.reset();
    setSearchTerm("");
    setFormError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleGroup = (groupId: string) => {
    const currentGroups = form.getValues("groupIds") || [];
    const newGroups = currentGroups.includes(groupId)
      ? currentGroups.filter(id => id !== groupId)
      : [...currentGroups, groupId];
    form.setValue("groupIds", newGroups, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async data => {
    if (!accountId) {
      setFormError("Account ID is required");
      return;
    }

    try {
      await createContact({
        accountId,
        name: data.name.trim(),
        address: data.address.trim(),
        groupIds: data.groupIds || [],
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create contact");
    }
  });

  useEffect(() => {
    if (isOpen) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} isCloseButton={false} className="w-[600px] bg-white p-0">
      <ModalHeader title="New contact" iconSrc="/common/create-modal-icon.svg" onClose={handleClose} />

      <form onSubmit={onSubmit}>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact information</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  {...form.register("name")}
                  type="text"
                  className="w-full bg-grey-50 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  placeholder="Name"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex-[2]">
                <input
                  {...form.register("address")}
                  type="text"
                  className="w-full bg-grey-50 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                  placeholder="0xF1E2d3c4B5A67890FEDCBA98765432..."
                />
                {form.formState.errors.address && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>

            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Enter group name" variant="compact" />

            {groups.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredGroups.map(group => {
                  const isSelected = safeSelectedGroupIds.includes(group.id);
                  const memberCount = getMemberCount(group);

                  return (
                    <div
                      key={group.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected ? "bg-pink-50" : "hover:bg-pink-50"
                      }`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Checkbox checked={isSelected} />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 m-0">{group.name}</p>
                        <p className="text-sm text-gray-500 m-0">
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {filteredGroups.length === 0 && <p className="text-center text-gray-400 py-4">No groups found</p>}
              </div>
            ) : (
              <p className="text-gray-400 text-sm py-4 text-center">
                No groups available. Please create a group first.
              </p>
            )}

            {form.formState.errors.groupIds && (
              <p className="text-red-500 text-sm mt-2">{form.formState.errors.groupIds.message}</p>
            )}
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-red-600 text-sm">{formError}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-grey-50 rounded-b-3xl">
          <button
            type="button"
            className="flex-1 max-w-[90px] w-full px-6 py-3 bg-grey-100 font-medium rounded-xl transition-colors cursor-pointer"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-[2] px-6 py-3 bg-pink-350 font-medium rounded-xl hover:bg-pink-450 transition-colors disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            {isPending ? <span className="loading loading-spinner loading-sm" /> : "Save contact"}
          </button>
        </div>
      </form>
    </ModalContainer>
  );
};

export default CreateContactModal;
