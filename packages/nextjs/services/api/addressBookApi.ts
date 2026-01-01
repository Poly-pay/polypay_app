import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import {
  AddressGroup,
  Contact,
  CreateAddressGroupDto,
  CreateContactDto,
  UpdateAddressGroupDto,
  UpdateContactDto,
} from "@polypay/shared";

export const addressBookApi = {
  groups: {
    getAll: async (walletId: string): Promise<AddressGroup[]> => {
      const { data } = await apiClient.get<AddressGroup[]>(API_ENDPOINTS.addressBook.groups.byWallet(walletId));
      return data;
    },

    getById: async (id: string): Promise<AddressGroup> => {
      const { data } = await apiClient.get<AddressGroup>(API_ENDPOINTS.addressBook.groups.byId(id));
      return data;
    },

    create: async (dto: CreateAddressGroupDto): Promise<AddressGroup> => {
      const { data } = await apiClient.post<AddressGroup>(API_ENDPOINTS.addressBook.groups.base, dto);
      return data;
    },

    update: async (id: string, dto: UpdateAddressGroupDto): Promise<AddressGroup> => {
      const { data } = await apiClient.patch<AddressGroup>(API_ENDPOINTS.addressBook.groups.byId(id), dto);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.addressBook.groups.byId(id));
    },
  },

  contacts: {
    getAll: async (walletId: string, groupId?: string): Promise<Contact[]> => {
      const { data } = await apiClient.get<Contact[]>(API_ENDPOINTS.addressBook.contacts.byWallet(walletId, groupId));
      return data;
    },

    getById: async (id: string): Promise<Contact> => {
      const { data } = await apiClient.get<Contact>(API_ENDPOINTS.addressBook.contacts.byId(id));
      return data;
    },

    create: async (dto: CreateContactDto): Promise<Contact> => {
      const { data } = await apiClient.post<Contact>(API_ENDPOINTS.addressBook.contacts.base, dto);
      return data;
    },

    update: async (id: string, dto: UpdateContactDto): Promise<Contact> => {
      const { data } = await apiClient.patch<Contact>(API_ENDPOINTS.addressBook.contacts.byId(id), dto);
      return data;
    },

    delete: async (id: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.addressBook.contacts.byId(id));
    },
  },
};
