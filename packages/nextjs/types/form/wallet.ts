export interface ISigner {
  commitment: string;
  name?: string;
}
export interface IWalletFormData {
  name: string;
  signers: ISigner[];
  threshold: number;
}
