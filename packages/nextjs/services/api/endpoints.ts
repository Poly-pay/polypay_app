export const API_ENDPOINTS = {
  wallets: {
    base: "/api/wallets",
    byAddress: (address: string) => `/api/wallets/${address}`,
  },

  accounts: {
    base: "/api/accounts",
    me: "/api/accounts/me",
    meWallets: "/api/accounts/me/wallets",
  },

  addressBook: {
    groups: {
      base: "/api/address-book/groups",
      byId: (id: string) => `/api/address-book/groups/${id}`,
      byWallet: (walletId: string) => `/api/address-book/groups?walletId=${walletId}`,
    },
    contacts: {
      base: "/api/address-book/contacts",
      byId: (id: string) => `/api/address-book/contacts/${id}`,
      byWallet: (walletId: string, groupId?: string) => {
        const params = new URLSearchParams({ walletId });
        if (groupId) params.append("groupId", groupId);
        return `/api/address-book/contacts?${params}`;
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
    byWallet: (walletAddress: string, status?: string) => {
      const params = new URLSearchParams({ walletAddress });
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
    byCommitment: (commitment: string) => `/api/notifications?commitment=${commitment}`,
    unreadCount: (commitment: string) => `/api/notifications/unread-count?commitment=${commitment}`,
    sendCommitment: "/api/notifications/send-commitment",
    markAsRead: (id: string) => `/api/notifications/${id}/read`,
    markAllAsRead: "/api/notifications/read-all",
  },

  auth: {
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
  },
} as const;
