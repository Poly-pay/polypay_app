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
  chainId: number;
  contractVersion: number;
  createdAt: string;
  updatedAt: string;
  signers: AccountSigner[];
  // "zk" (default, privacy-preserving) or "ecdsa" (Arc, non-private). Optional so
  // existing ZK payloads without the field are still valid.
  chainType?: "zk" | "ecdsa";
}
