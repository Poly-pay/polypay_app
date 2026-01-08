import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import {
  Contact,
  ContactGroup,
  CreateContactDto,
  CreateContactGroupDto,
  UpdateContactDto,
  UpdateContactGroupDto,
} from "@polypay/shared";

export const contactBookApi = {
  groups: {
    getAll: async (accountId: string): Promise<ContactGroup[]> => {
      const { data } = await apiClient.get<ContactGroup[]>(API_ENDPOINTS.contactBook.groups.byAccount(accountId));
      return data;
    },

    getById: async (id: string): Promise<ContactGroup> => {
      const { data } = await apiClient.get<ContactGroup>(API_ENDPOINTS.contactBook.groups.byId(id));
      return data;
    },

    create: async (dto: CreateContactGroupDto): Promise<ContactGroup> => {
      const { data } = await apiClient.post<ContactGroup>(API_ENDPOINTS.contactBook.groups.base, dto);
      return data;
    },

    update: async (id: string, dto: UpdateContactGroupDto): Promise<ContactGroup> => {
      const { data } = await apiClient.patch<ContactGroup>(API_ENDPOINTS.contactBook.groups.byId(id), dto);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.contactBook.groups.byId(id));
    },
  },

  contacts: {
    getAll: async (accountId: string, groupId?: string): Promise<Contact[]> => {
      const { data } = await apiClient.get<Contact[]>(API_ENDPOINTS.contactBook.contacts.byAccount(accountId, groupId));
      return data;
    },

    getById: async (id: string): Promise<Contact> => {
      const { data } = await apiClient.get<Contact>(API_ENDPOINTS.contactBook.contacts.byId(id));
      return data;
    },

    create: async (dto: CreateContactDto): Promise<Contact> => {
      const { data } = await apiClient.post<Contact>(API_ENDPOINTS.contactBook.contacts.base, dto);
      return data;
    },

    update: async (id: string, dto: UpdateContactDto): Promise<Contact> => {
      const { data } = await apiClient.patch<Contact>(API_ENDPOINTS.contactBook.contacts.byId(id), dto);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.contactBook.contacts.byId(id));
    },
  },
};
