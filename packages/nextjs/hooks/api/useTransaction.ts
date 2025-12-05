
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProofJob } from "./useProofJob";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type TxStatus = "PENDING" | "READY" | "EXECUTED" | "FAILED";

export interface CreateTransactionDto {
  txId: number;
  to: string;
  value: string;
  callData?: string;
  signaturesRequired: number;
}

export interface Transaction {
  id: string;
  txId: number;
  to: string;
  value: string;
  callData: string | null;
  signaturesRequired: number;
  status: TxStatus;
  signatureCount?: number;
  executedAt: string | null;
  createdAt: string;
  proofJobs?: ProofJob[];
}

// API Functions
const createTransactionAPI = async (data: CreateTransactionDto): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create transaction");
  }

  const result = await response.json();
  return result.data;
};

const getTransactionsAPI = async (status?: TxStatus): Promise<Transaction[]> => {
  const url = status
    ? `${API_BASE_URL}/api/transactions?status=${status}`
    : `${API_BASE_URL}/api/transactions`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  const result = await response.json();
  return result.data;
};

const getTransactionAPI = async (txId: number): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch transaction");
  }

  const result = await response.json();
  return result.data;
};

const markExecutedAPI = async (txId: number): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/executed`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Failed to mark transaction as executed");
  }

  const result = await response.json();
  return result.data;
};

// Query Keys
export const transactionKeys = {
  all: ["transactions"] as const,
  byStatus: (status: TxStatus) => [...transactionKeys.all, status] as const,
  byTxId: (txId: number) => [...transactionKeys.all, txId] as const,
  pending: () => [...transactionKeys.all, "pending"] as const,
  ready: () => [...transactionKeys.all, "ready"] as const,
};

// Hooks
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransactionAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

export const useTransactions = (status?: TxStatus) => {
  return useQuery({
    queryKey: status ? transactionKeys.byStatus(status) : transactionKeys.all,
    queryFn: () => getTransactionsAPI(status),
  });
};

export const useTransaction = (txId: number) => {
  return useQuery({
    queryKey: transactionKeys.byTxId(txId),
    queryFn: () => getTransactionAPI(txId),
    enabled: txId !== undefined,
  });
};

export const usePendingTransactions = () => {
  return useQuery({
    queryKey: transactionKeys.pending(),
    queryFn: () => getTransactionsAPI("PENDING"),
  });
};

export const useReadyTransactions = () => {
  return useQuery({
    queryKey: transactionKeys.ready(),
    queryFn: () => getTransactionsAPI("READY"),
  });
};

export const useMarkExecuted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markExecutedAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};