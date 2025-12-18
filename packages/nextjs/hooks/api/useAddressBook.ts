import {
  AddressGroup,
  Contact,
  CreateAddressGroupDto,
  CreateContactDto,
  UpdateAddressGroupDto,
  UpdateContactDto,
} from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "~~/constants";

// ==================== Query Keys ====================

export const addressBookKeys = {
  all: ["addressBook"] as const,
  groups: (walletId: string) => [...addressBookKeys.all, "groups", walletId] as const,
  group: (id: string) => [...addressBookKeys.all, "group", id] as const,
  contacts: (walletId: string, groupId?: string) => [...addressBookKeys.all, "contacts", walletId, groupId] as const,
  contact: (id: string) => [...addressBookKeys.all, "contact", id] as const,
};

// ==================== API Functions ====================

// Groups
const getGroupsAPI = async (walletId: string): Promise<AddressGroup[]> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/groups?walletId=${walletId}`);
  if (!response.ok) throw new Error("Failed to fetch groups");
  return response.json();
};

const getGroupAPI = async (id: string): Promise<AddressGroup> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/groups/${id}`);
  if (!response.ok) throw new Error("Failed to fetch group");
  return response.json();
};

const createGroupAPI = async (dto: CreateAddressGroupDto): Promise<AddressGroup> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create group");
  }
  return response.json();
};

const updateGroupAPI = async (id: string, dto: UpdateAddressGroupDto): Promise<AddressGroup> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update group");
  }
  return response.json();
};

const deleteGroupAPI = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/groups/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete group");
};

// Contacts
const getContactsAPI = async (walletId: string, groupId?: string): Promise<Contact[]> => {
  const params = new URLSearchParams({ walletId });
  if (groupId) params.append("groupId", groupId);

  const response = await fetch(`${API_BASE_URL}/api/address-book/contacts?${params}`);
  if (!response.ok) throw new Error("Failed to fetch contacts");
  return response.json();
};

const getContactAPI = async (id: string): Promise<Contact> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/contacts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch contact");
  return response.json();
};

const createContactAPI = async (dto: CreateContactDto): Promise<Contact> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create contact");
  }
  return response.json();
};

const updateContactAPI = async (id: string, dto: UpdateContactDto): Promise<Contact> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update contact");
  }
  return response.json();
};

const deleteContactAPI = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/address-book/contacts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete contact");
};

// ==================== Hooks ====================

// Groups
export const useGroups = (walletId: string | null) => {
  return useQuery({
    queryKey: addressBookKeys.groups(walletId || ""),
    queryFn: () => getGroupsAPI(walletId!),
    enabled: !!walletId,
  });
};

export const useGroup = (id: string | null) => {
  return useQuery({
    queryKey: addressBookKeys.group(id || ""),
    queryFn: () => getGroupAPI(id!),
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroupAPI,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(variables.walletId),
      });
    },
  });
};

export const useUpdateGroup = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAddressGroupDto }) => updateGroupAPI(id, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.group(data.id),
      });
    },
  });
};

export const useDeleteGroup = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGroupAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
      // Also invalidate contacts since deleting group affects contacts
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
    },
  });
};

// Contacts
export const useContacts = (walletId: string | null, groupId?: string) => {
  return useQuery({
    queryKey: addressBookKeys.contacts(walletId || "", groupId),
    queryFn: () => getContactsAPI(walletId!, groupId),
    enabled: !!walletId,
  });
};

export const useContact = (id: string | null) => {
  return useQuery({
    queryKey: addressBookKeys.contact(id || ""),
    queryFn: () => getContactAPI(id!),
    enabled: !!id,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContactAPI,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(variables.walletId),
      });
      // Also invalidate groups since contact count may change
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(variables.walletId),
      });
    },
  });
};

export const useUpdateContact = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContactDto }) => updateContactAPI(id, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contact(data.id),
      });
      // Also invalidate groups if groupIds changed
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
    },
  });
};

export const useDeleteContact = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContactAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
      // Also invalidate groups since contact count may change
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
    },
  });
};
