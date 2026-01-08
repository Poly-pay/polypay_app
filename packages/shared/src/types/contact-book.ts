export interface ContactGroupEntry {
  contactId: string;
  groupId: string;
  contact?: Contact;
  group?: ContactGroup;
}

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  address: string;
  groups: ContactGroupEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactGroup {
  id: string;
  accountId: string;
  name: string;
  contacts: ContactGroupEntry[];
  createdAt: string;
  updatedAt: string;
}
