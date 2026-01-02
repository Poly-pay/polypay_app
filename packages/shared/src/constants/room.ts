export const ROOM_PREFIX = {
  WALLET: 'wallet',
  COMMITMENT: 'commitment',
} as const;

export function getWalletRoom(address: string): string {
  return `${ROOM_PREFIX.WALLET}:${address}`;
}

export function getCommitmentRoom(commitment: string): string {
  return `${ROOM_PREFIX.COMMITMENT}:${commitment}`;
}