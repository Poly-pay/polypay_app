export interface Contact {
  id: string;
  groupId: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressGroup {
  id: string;
  walletId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
}