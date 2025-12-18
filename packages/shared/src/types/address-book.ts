export interface ContactGroup {
  contactId: string;
  groupId: string;
  contact?: Contact;
  group?: AddressGroup;
}

export interface Contact {
  id: string;
  walletId: string;
  name: string;
  address: string;
  groups: ContactGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface AddressGroup {
  id: string;
  walletId: string;
  name: string;
  contacts: ContactGroup[];
  createdAt: string;
  updatedAt: string;
}
