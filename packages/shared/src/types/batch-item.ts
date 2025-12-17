export interface BatchItem {
  id: string;
  accountId: string;
  recipient: string;
  amount: string;
  tokenAddress?: string;
  contactId?: string;
  contact?: {
    id: string;
    name: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
}
