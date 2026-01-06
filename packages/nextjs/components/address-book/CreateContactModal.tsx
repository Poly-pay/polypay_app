import { useEffect, useMemo, useState } from "react";
import { AddressGroup } from "@polypay/shared";
import { Search, X } from "lucide-react";
import { useCreateContact } from "~~/hooks";
import { useZodForm } from "~~/hooks/form";
import { CreateContactFormData, createContactSchema } from "~~/lib/form";

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  walletId: string;
  groups: AddressGroup[];
}

function getMemberCount(group: AddressGroup): number {
  return group.contacts?.length || 0;
}

export function CreateContactModal({ isOpen, onClose, onSuccess, walletId, groups }: CreateContactModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [formError, setFormError] = useState("");

  const createContact = useCreateContact();

  const form = useZodForm({
    schema: createContactSchema,
    defaultValues: {
      name: "",
      address: "",
      groupIds: [],
      notes: "",
    },
  });

  // Watch groupIds for selection
  const selectedGroupIds = form.watch("groupIds");

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(group => group.name.toLowerCase().includes(term));
  }, [groups, searchTerm]);

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
    const currentGroups = form.getValues("groupIds");
    const newGroups = currentGroups.includes(groupId)
      ? currentGroups.filter(id => id !== groupId)
      : [...currentGroups, groupId];
    form.setValue("groupIds", newGroups, { shouldValidate: true });
  };

  const handleSubmit = async (data: CreateContactFormData) => {
    setFormError("");

    try {
      await createContact.mutateAsync({
        walletId,
        name: data.name.trim(),
        address: data.address.trim(),
        groupIds: data.groupIds,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create contact");
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
      <div className="relative bg-white rounded-2xl shadow-xl w-[600px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white" />
            </div>
            <h3 className="font-bold text-lg tracking-wide uppercase text-gray-800">New Contact</h3>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={handleClose}>
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="p-5 space-y-5">
            {/* Contact Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact information</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    {...form.register("name")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm"
                    placeholder="0xF1E2d3c4B5A67890FEDCBA98765432..."
                  />
                  {form.formState.errors.address && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Category (Groups) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  placeholder="Enter group name"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Group List */}
              {groups.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredGroups.map(group => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    const memberCount = getMemberCount(group);

                    return (
                      <div
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? "bg-cyan-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleGroup(group.id)}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#FF7CEB] border-[#FF7CEB]" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        {/* Group Info */}
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
              disabled={createContact.isPending || groups.length === 0}
            >
              {createContact.isPending ? <span className="loading loading-spinner loading-sm" /> : "Save contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
