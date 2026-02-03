export const ACCOUNT_AVATARS = [
  "/avatars/account-avatar-1.svg",
  "/avatars/account-avatar-2.svg",
  "/avatars/account-avatar-3.svg",
  "/avatars/account-avatar-4.svg",
];

export const getAvatarByAccountId = (accountId: string): string => {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ACCOUNT_AVATARS.length;
  return ACCOUNT_AVATARS[index];
};

export const USER_AVATARS = [
  "/avatars/users/user-1.svg",
  "/avatars/users/user-2.svg",
  "/avatars/users/user-3.svg",
  "/avatars/users/user-4.svg",
  "/avatars/users/user-5.svg",
  "/avatars/users/user-6.svg",
];

export const getAvatarByCommitment = (commitment: string): string => {
  let hash = 0;
  for (let i = 0; i < commitment.length; i++) {
    hash = commitment.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_AVATARS.length;
  return USER_AVATARS[index];
};
