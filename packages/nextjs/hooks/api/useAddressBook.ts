import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import { UpdateAddressGroupDto, UpdateContactDto } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addressBookApi } from "~~/services/api";

export const addressBookKeys = {
  all: ["addressBook"] as const,
  groups: (walletId: string) => [...addressBookKeys.all, "groups", walletId] as const,
  group: (id: string) => [...addressBookKeys.all, "group", id] as const,
  contacts: (walletId: string, groupId?: string) => [...addressBookKeys.all, "contacts", walletId, groupId] as const,
  contact: (id: string) => [...addressBookKeys.all, "contact", id] as const,
};

export const useGroups = (walletId: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.groups(walletId || ""),
    queryFn: () => addressBookApi.groups.getAll(walletId!),
    enabled: !!walletId,
  });
};

export const useGroup = (id: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.group(id || ""),
    queryFn: () => addressBookApi.groups.getById(id!),
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressBookApi.groups.create,
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
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAddressGroupDto }) => addressBookApi.groups.update(id, dto),
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
    mutationFn: addressBookApi.groups.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
    },
  });
};

export const useContacts = (walletId: string | null, groupId?: string) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.contacts(walletId || "", groupId),
    queryFn: () => addressBookApi.contacts.getAll(walletId!, groupId),
    enabled: !!walletId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useContact = (id: string | null) => {
  return useAuthenticatedQuery({
    queryKey: addressBookKeys.contact(id || ""),
    queryFn: () => addressBookApi.contacts.getById(id!),
    enabled: !!id,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressBookApi.contacts.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(variables.walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(variables.walletId),
      });
    },
  });
};

export const useUpdateContact = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContactDto }) => addressBookApi.contacts.update(id, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contact(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
    },
  });
};

export const useDeleteContact = (walletId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressBookApi.contacts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.contacts(walletId),
      });
      queryClient.invalidateQueries({
        queryKey: addressBookKeys.groups(walletId),
      });
    },
  });
};
