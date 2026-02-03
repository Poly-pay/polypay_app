export const API_ENDPOINTS = {
  accounts: {
    base: "/api/accounts",
    byAddress: (address: string) => `/api/accounts/${address}`,
  },

  users: {
    base: "/api/users",
    me: "/api/users/me",
    meAccounts: "/api/users/me/accounts",
  },

  contactBook: {
    groups: {
      base: "/api/contact-book/groups",
      byId: (id: string) => `/api/contact-book/groups/${id}`,
      byAccount: (accountId: string) =>
        `/api/contact-book/groups?accountId=${accountId}`,
    },
    contacts: {
      base: "/api/contact-book/contacts",
      byId: (id: string) => `/api/contact-book/contacts/${id}`,
      byAccount: (accountId: string, groupId?: string) => {
        const params = new URLSearchParams({ accountId });
        if (groupId) params.append("groupId", groupId);
        return `/api/contact-book/contacts?${params}`;
      },
    },
  },

  batchItems: {
    base: "/api/batch-items",
    me: "/api/batch-items/me",
    byId: (id: string) => `/api/batch-items/${id}`,
  },

  transactions: {
    base: "/api/transactions",
    byTxId: (txId: number) => `/api/transactions/${txId}`,
    byAccount: (accountAddress: string, status?: string) => {
      const params = new URLSearchParams({ accountAddress });
      if (status) params.append("status", status);
      return `/api/transactions?${params}`;
    },
    approve: (txId: number) => `/api/transactions/${txId}/approve`,
    deny: (txId: number) => `/api/transactions/${txId}/deny`,
    markExecuted: (txId: number) => `/api/transactions/${txId}/executed`,
    execute: (txId: number) => `/api/transactions/${txId}/execute`,
    reserveNonce: "/api/transactions/reserve-nonce",
  },

  notifications: {
    base: "/api/notifications",
    byId: (id: string) => `/api/notifications/${id}`,
    byCommitment: (commitment: string) =>
      `/api/notifications?commitment=${commitment}`,
    unreadCount: (commitment: string) =>
      `/api/notifications/unread-count?commitment=${commitment}`,
    sendCommitment: "/api/notifications/send-commitment",
    markAsRead: (id: string) => `/api/notifications/${id}/read`,
    markAllAsRead: "/api/notifications/read-all",
  },

  auth: {
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
  },

  prices: {
    base: "/api/prices",
  },

  featureRequests: {
    base: "/api/feature-requests",
  },

  quests: {
    base: "/api/quests",
    leaderboard: "/api/quests/leaderboard",
    myPoints: "/api/quests/my-points",
  },
} as const;
