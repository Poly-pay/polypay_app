export interface AccountSigner {
  commitment: string;
  name?: string;
  isCreator: boolean;
}

export interface Account {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  updatedAt: string;
  signers: AccountSigner[];
}