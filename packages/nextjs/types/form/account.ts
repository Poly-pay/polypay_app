export interface ISigner {
  // Poseidon ZK identity commitment. Surfaced in the UI as "Membership ID".
  commitment: string;
  name?: string;
}
export interface IAccountFormData {
  name: string;
  signers: ISigner[];
  threshold: number;
}
