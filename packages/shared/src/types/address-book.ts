export interface Contact {
  id: string;
  walletId: string;
  name: string;
  address: string;
  groups: AddressGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface AddressGroup {
  id: string;
  walletId: string;
  name: string;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}
