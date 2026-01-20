export const ROOM_PREFIX = {
  ACCOUNT: "account",
  COMMITMENT: "commitment",
} as const;

export function getAccountRoom(address: string): string {
  return `${ROOM_PREFIX.ACCOUNT}:${address}`;
}

export function getCommitmentRoom(commitment: string): string {
  return `${ROOM_PREFIX.COMMITMENT}:${commitment}`;
}
