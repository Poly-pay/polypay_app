import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@polypay/shared";
import {
  ApproveTransactionDto,
  CreateTransactionDto,
  DenyTransactionDto,
  Transaction,
  TxStatus,
  TxType,
  VoteType,
} from "@polypay/shared";

export const transactionApi = {
  create: async (
    dto: CreateTransactionDto,
  ): Promise<{
    nonce: number;
    type: TxType;
    status: TxStatus;
    jobId: string;
  }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.transactions.base, dto);
    return data;
  },

  getAll: async (walletAddress: string, status?: TxStatus): Promise<Transaction[]> => {
    const { data } = await apiClient.get<Transaction[]>(API_ENDPOINTS.transactions.byWallet(walletAddress, status));
    return data;
  },

  getById: async (txId: number): Promise<Transaction> => {
    const { data } = await apiClient.get<Transaction>(API_ENDPOINTS.transactions.byTxId(txId));
    return data;
  },

  approve: async (
    txId: number,
    dto: ApproveTransactionDto,
  ): Promise<{
    txId: number;
    voteType: VoteType;
    jobId: string;
    status: TxStatus;
    approveCount: number;
    threshold: number;
  }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.transactions.approve(txId), dto);
    return data;
  },

  deny: async (
    txId: number,
    dto: DenyTransactionDto,
  ): Promise<{
    txId: number;
    voteType: VoteType;
    status: TxStatus;
    denyCount: number;
  }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.transactions.deny(txId), dto);
    return data;
  },

  markExecuted: async (txId: number, txHash: string): Promise<Transaction> => {
    const { data } = await apiClient.patch<Transaction>(API_ENDPOINTS.transactions.markExecuted(txId), { txHash });
    return data;
  },

  execute: async (
    txId: number,
  ): Promise<{
    txId: number;
    txHash: string;
    status: TxStatus;
  }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.transactions.execute(txId));
    return data;
  },

  reserveNonce: async (walletAddress: string): Promise<{ nonce: number; expiresAt: string }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.transactions.reserveNonce, { walletAddress });
    return data;
  },
};
