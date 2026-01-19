import { ISigner } from "~~/types/form/account";

/**
 * Validate commitment format (only numbers)
 */
export const isValidCommitment = (commitment: string): boolean => {
  const trimmed = commitment?.trim();
  if (!trimmed) return false;
  return /^\d+$/.test(trimmed);
};

/**
 * Check if commitment at index is duplicate with other signers
 */
export const isDuplicateCommitment = (signers: ISigner[], index: number): boolean => {
  const currentCommitment = signers[index]?.commitment?.trim();
  if (!currentCommitment) return false;

  return signers.some((signer, i) => i !== index && signer?.commitment?.trim() === currentCommitment);
};

/**
 * Check if any signer has duplicate commitment
 */
export const hasDuplicateSigners = (signers: ISigner[]): boolean => {
  const commitments = signers.map(s => s?.commitment?.trim()).filter(c => c !== "");
  return new Set(commitments).size !== commitments.length;
};

/**
 * Filter valid signers (valid format + no duplicate)
 */
export const getValidSigners = <T extends { commitment: string }>(signers: T[]): T[] => {
  return signers.filter((signer, index) => {
    if (!isValidCommitment(signer.commitment)) return false;
    return !isDuplicateCommitment(signers, index);
  });
};
