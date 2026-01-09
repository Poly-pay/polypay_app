export interface ISigner {
  commitment: string;
  name?: string;
}
export interface IAccountFormData {
  name: string;
  signers: ISigner[];
  threshold: number;
}
