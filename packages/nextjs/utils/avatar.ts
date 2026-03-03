export const ACCOUNT_AVATARS = [
  "/avatars/account-avatar-1.svg",
  "/avatars/account-avatar-2.svg",
  "/avatars/account-avatar-3.svg",
  "/avatars/account-avatar-4.svg",
];

const BASE_CHAIN_IDS = [8453, 84532];
const HORIZEN_CHAIN_IDS = [26514, 2651420];

const FIRST_ACCOUNT_AVATAR: Record<string, string> = {
  base: "/avatars/account-avatar-2.svg",
  horizen: "/avatars/account-avatar-4.svg",
};

function getNetworkGroup(chainId: number): string | null {
  if (BASE_CHAIN_IDS.includes(chainId)) return "base";
  if (HORIZEN_CHAIN_IDS.includes(chainId)) return "horizen";
  return null;
}

export const getAvatarByAccountId = (accountId: string): string => {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ACCOUNT_AVATARS.length;
  return ACCOUNT_AVATARS[index];
};

export const getAccountAvatar = (
  account: { id: string; chainId: number; createdAt: string },
  allAccounts: { id: string; chainId: number; createdAt: string }[],
): string => {
  const sameChainAccounts = allAccounts.filter(a => a.chainId === account.chainId);
  if (sameChainAccounts.length > 0) {
    const earliest = sameChainAccounts.reduce((min, a) => (new Date(a.createdAt) < new Date(min.createdAt) ? a : min));
    if (earliest.id === account.id) {
      const group = getNetworkGroup(account.chainId);
      if (group && FIRST_ACCOUNT_AVATAR[group]) {
        return FIRST_ACCOUNT_AVATAR[group];
      }
    }
  }
  return getAvatarByAccountId(account.id);
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
