import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { UpdateContactDto, UpdateContactGroupDto } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contactBookApi } from "~~/services/api";

export const addressBookKeys = {
  all: ["addressBook"] as const,
  groups: (accountId: string) => [...addressBookKeys.all, "groups", accountId] as const,
  group: (id: string) => [...addressBookKeys.all, "group", id] as const,
  contacts: (accountId: string, groupId?: string) => [...addressBookKeys.all, "contacts", accountId, groupId] as const,
  contact: (id: string) => [...addressBookKeys.all, "contact", id] as const,
};

export const useGroups = (accountId: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.groups(accountId || ""),
    queryFn: () => contactBookApi.groups.getAll(accountId!),
    enabled: !!accountId,
  });
};

export const useGroup = (id: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.group(id || ""),
    queryFn: () => contactBookApi.groups.getById(id!),
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactBookApi.groups.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(variables.accountId),
      });
    },
  });
};

export const useUpdateGroup = (accountId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContactGroupDto }) => contactBookApi.groups.update(id, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.group(data.id),
      });
    },
  });
};

export const useDeleteGroup = (accountId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactBookApi.groups.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(accountId),
      });
    },
  });
};

export const useContacts = (accountId: string | null, groupId?: string) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.contacts(accountId || "", groupId),
    queryFn: () => contactBookApi.contacts.getAll(accountId!, groupId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useContact = (id: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.contact(id || ""),
    queryFn: () => contactBookApi.contacts.getById(id!),
    enabled: !!id,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactBookApi.contacts.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(variables.accountId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(variables.accountId),
      });
    },
  });
};

export const useUpdateContact = (accountId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContactDto }) => contactBookApi.contacts.update(id, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contact(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(accountId),
      });
    },
  });
};

export const useDeleteContact = (accountId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactBookApi.contacts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(accountId),
      });
    },
  });
};
