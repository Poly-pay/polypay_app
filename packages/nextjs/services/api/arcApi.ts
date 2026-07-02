import { useArcIdentityStore } from "../store";
import { apiClient } from "./apiClient";
import { TxStatus } from "@polypay/shared";

// Circle Arc (ECDSA multisig) endpoints. Routes mirror the backend controllers
// under packages/backend/src/arc/*/*.controller.ts (all behind the global
// "/api" prefix set in main.ts).
const ARC_ENDPOINTS = {
  auth: {
    nonce: "/api/arc/auth/nonce",
    login: "/api/arc/auth/login",
  },
  accounts: {
    base: "/api/arc/accounts",
  },
  transactions: {
    base: "/api/arc/transactions",
    nextNonce: "/api/arc/transactions/next-nonce",
    approve: (txId: number) => `/api/arc/transactions/${txId}/approve`,
    execute: (txId: number) => `/api/arc/transactions/${txId}/execute`,
  },
} as const;

// Arc requests are guarded by ArcAuthGuard (arc-jwt), a separate JWT from the
// ZK session token. The default apiClient interceptor (see apiClient.ts) now
// skips attaching the ZK access token for "/api/arc/*" calls, so this
// interceptor is the one that sets the Authorization header for Arc requests
// with the Arc token (or strips it entirely for the public nonce/login
// endpoints, when no Arc session exists yet).
apiClient.interceptors.request.use(config => {
  if (config.url?.includes("/api/arc/")) {
    const { accessToken } = useArcIdentityStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
  }
  return config;
});

export interface ArcAccount {
  id: string;
  address: string;
  name?: string;
  threshold: number;
  chainId: number;
  chainType: string;
  signers: string[];
}

export interface CreateArcAccountDto {
  name?: string;
  owners: string[];
  threshold: number;
  chainId: number;
}

export interface ProposeArcTransactionDto {
  accountId: string;
  to: string;
  value: string;
  // Arc currently supports native-value transfers only (see
  // CreateArcTransactionDto on the backend), so data is always "0x".
  data: "0x";
  signature: string;
}

export interface ApproveArcTransactionDto {
  signature: string;
}

export interface ArcTransaction {
  id: number;
  nonce: number;
  to: string;
  value: string;
  // Arc currently supports native-value transfers only, so data is always "0x".
  data: "0x";
  status: TxStatus;
  threshold: number;
  approveCount: number;
  voters: string[];
  txHash: string | null;
}

export const arcApi = {
  getNonce: async (address: string): Promise<string> => {
    const { data } = await apiClient.post<{ nonce: string }>(ARC_ENDPOINTS.auth.nonce, { address });
    return data.nonce;
  },

  login: async (address: string, signature: string): Promise<{ accessToken: string }> => {
    const { data } = await apiClient.post<{ accessToken: string }>(ARC_ENDPOINTS.auth.login, { address, signature });
    return data;
  },

  createAccount: async (dto: CreateArcAccountDto): Promise<ArcAccount> => {
    const { data } = await apiClient.post<ArcAccount>(ARC_ENDPOINTS.accounts.base, dto);
    return data;
  },

  getAccounts: async (): Promise<ArcAccount[]> => {
    const { data } = await apiClient.get<ArcAccount[]>(ARC_ENDPOINTS.accounts.base);
    return data;
  },

  nextNonce: async (accountId: string): Promise<{ nonce: number }> => {
    const { data } = await apiClient.get<{ nonce: number }>(ARC_ENDPOINTS.transactions.nextNonce, {
      params: { accountId },
    });
    return data;
  },

  getTransactions: async (accountId: string): Promise<ArcTransaction[]> => {
    const { data } = await apiClient.get<ArcTransaction[]>(ARC_ENDPOINTS.transactions.base, {
      params: { accountId },
    });
    return data;
  },

  proposeTx: async (
    dto: ProposeArcTransactionDto,
  ): Promise<{
    txId: number;
    nonce: number;
    status: TxStatus;
  }> => {
    const { data } = await apiClient.post(ARC_ENDPOINTS.transactions.base, dto);
    return data;
  },

  approveTx: async (
    txId: number,
    dto: ApproveArcTransactionDto,
  ): Promise<{
    txId: number;
    status: TxStatus;
    approveCount: number;
    threshold: number;
  }> => {
    const { data } = await apiClient.post(ARC_ENDPOINTS.transactions.approve(txId), dto);
    return data;
  },

  executeTx: async (
    txId: number,
  ): Promise<{
    txId: number;
    status: TxStatus;
    txHash: string;
  }> => {
    const { data } = await apiClient.post(ARC_ENDPOINTS.transactions.execute(txId));
    return data;
  },
};
