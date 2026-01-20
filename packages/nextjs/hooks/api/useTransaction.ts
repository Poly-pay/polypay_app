import { useCallback } from "react";
import { accountContractKeys } from "../app";
import { useSocketEvent } from "../app/useSocketEvent";
import { useAuthenticatedQuery } from "./useAuthenticatedQuery";
import {
  ApproveTransactionDto,
  DEFAULT_PAGE_SIZE,
  DenyTransactionDto,
  ExecuteTransactionDto,
  PaginatedResponse,
  TX_CREATED_EVENT,
  TX_STATUS_EVENT,
  TX_VOTED_EVENT,
  Transaction,
  TxCreatedEventData,
  TxStatus,
  TxStatusEventData,
  TxVotedEventData,
} from "@polypay/shared";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "~~/services/api";
import { useIdentityStore } from "~~/services/store";

// ============ Query Keys ============

export const transactionKeys = {
  all: ["transactions"] as const,
  byAccount: (accountAddress: string) => [...transactionKeys.all, accountAddress] as const,
  byAccountAndStatus: (accountAddress: string, status: TxStatus) =>
    [...transactionKeys.all, accountAddress, status] as const,
  byTxId: (txId: number) => [...transactionKeys.all, "detail", txId] as const,
};

// ============ Hooks ============

/**
 * Create new transaction with ZK proof
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionApi.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byAccount(variables.accountAddress),
      });
    },
  });
};

/**
 * Infinite scroll hook for transactions
 */
export const useTransactionsInfinite = (accountAddress: string, status?: TxStatus) => {
  const { accessToken } = useIdentityStore();

  return useInfiniteQuery({
    queryKey: status
      ? [...transactionKeys.byAccountAndStatus(accountAddress, status), "infinite"]
      : [...transactionKeys.byAccount(accountAddress), "infinite"],
    queryFn: ({ pageParam }) =>
      transactionApi.getAll(accountAddress, status, {
        limit: DEFAULT_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<Transaction>) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!accessToken && !!accountAddress,
  });
};

/**
 * Get single transaction by txId
 */
export const useTransaction = (txId: number) => {
  return useAuthenticatedQuery({
    queryKey: transactionKeys.byTxId(txId),
    queryFn: () => transactionApi.getById(txId),
    enabled: txId > 0,
  });
};

/**
 * Approve transaction with ZK proof
 */
export const useApproveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: ApproveTransactionDto }) => transactionApi.approve(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Deny transaction
 */
export const useDenyTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: DenyTransactionDto }) => transactionApi.deny(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Mark transaction as executed
 */
export const useMarkTransactionExecuted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, txHash }: { txId: number; txHash: string }) => transactionApi.markExecuted(txId, txHash),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Execute transaction on-chain via relayer
 */
export const useExecuteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: ExecuteTransactionDto }) => transactionApi.execute(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Reserve nonce for new transaction
 */
export const useReserveNonce = () => {
  return useMutation({
    mutationFn: transactionApi.reserveNonce,
  });
};

// ============ Utility Hooks ============

/**
 * Get pending transactions for an account
 */
export const usePendingTransactions = (accountAddress: string) => {
  return useTransactionsInfinite(accountAddress, TxStatus.PENDING);
};

/**
 * Listen for realtime transaction updates
 * Use this in components that display transaction list
 */
export const useTransactionRealtime = (accountAddress: string | undefined) => {
  const queryClient = useQueryClient();

  // Handle new transaction created
  const handleTxCreated = useCallback(
    (data: TxCreatedEventData) => {
      console.log("[Socket] TX created:", data);
      if (accountAddress) {
        queryClient.invalidateQueries({ queryKey: transactionKeys.byAccount(accountAddress) });
      }
    },
    [queryClient, accountAddress],
  );

  // Handle transaction status change
  const handleTxStatus = useCallback(
    (data: TxStatusEventData) => {
      console.log("[Socket] TX status:", data);
      if (accountAddress) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byAccount(accountAddress),
        });

        // Refetch contract data when tx executed
        if (data.status === TxStatus.EXECUTED) {
          queryClient.invalidateQueries({
            queryKey: accountContractKeys.commitments(accountAddress),
          });
          queryClient.invalidateQueries({
            queryKey: accountContractKeys.threshold(accountAddress),
          });
        }
      }
    },
    [queryClient, accountAddress],
  );

  // Handle transaction voted
  const handleTxVoted = useCallback(
    (data: TxVotedEventData) => {
      console.log("[Socket] TX voted:", data);
      if (accountAddress) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byAccount(accountAddress),
        });
      }
    },
    [queryClient, accountAddress],
  );

  // Subscribe to socket events
  useSocketEvent(TX_CREATED_EVENT, handleTxCreated);
  useSocketEvent(TX_STATUS_EVENT, handleTxStatus);
  useSocketEvent(TX_VOTED_EVENT, handleTxVoted);
};
