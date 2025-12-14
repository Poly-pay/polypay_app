export interface WalletSigner {
  commitment: string;
  name?: string;
  isCreator: boolean;
}

export interface Wallet {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  updatedAt: string;
  signers: WalletSigner[];
}
