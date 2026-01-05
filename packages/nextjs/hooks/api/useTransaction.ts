import { useCallback } from "react";
import { walletContractKeys } from "../app";
import { useSocketEvent } from "../app/useSocketEvent";
import {
  ApproveTransactionDto,
  DenyTransactionDto,
  TX_CREATED_EVENT,
  TX_STATUS_EVENT,
  TX_VOTED_EVENT,
  TxCreatedEventData,
  TxStatus,
  TxStatusEventData,
  TxVotedEventData,
} from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "~~/services/api";

// ============ Query Keys ============

export const transactionKeys = {
  all: ["transactions"] as const,
  byWallet: (walletAddress: string) => [...transactionKeys.all, walletAddress] as const,
  byWalletAndStatus: (walletAddress: string, status: TxStatus) =>
    [...transactionKeys.all, walletAddress, status] as const,
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
        queryKey: transactionKeys.byWallet(variables.walletAddress),
      });
    },
  });
};

/**
 * Get all transactions for a wallet
 */
export const useTransactions = (walletAddress: string, status?: TxStatus) => {
  return useQuery({
    queryKey: status
      ? transactionKeys.byWalletAndStatus(walletAddress, status)
      : transactionKeys.byWallet(walletAddress),
    queryFn: () => transactionApi.getAll(walletAddress, status),
    enabled: !!walletAddress,
  });
};

/**
 * Get single transaction by txId
 */
export const useTransaction = (txId: number) => {
  return useQuery({
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
    mutationFn: transactionApi.execute,
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
 * Get pending transactions for a wallet
 */
export const usePendingTransactions = (walletAddress: string) => {
  return useTransactions(walletAddress, TxStatus.PENDING);
};

/**
 * Listen for realtime transaction updates
 * Use this in components that display transaction list
 */
export const useTransactionRealtime = (walletAddress: string | undefined) => {
  const queryClient = useQueryClient();

  // Handle new transaction created
  const handleTxCreated = useCallback(
    (data: TxCreatedEventData) => {
      console.log("[Socket] TX created:", data);
      if (walletAddress) {
        queryClient.invalidateQueries({ queryKey: transactionKeys.byWallet(walletAddress) });
      }
    },
    [queryClient, walletAddress],
  );

  // Handle transaction status change
  const handleTxStatus = useCallback(
    (data: TxStatusEventData) => {
      console.log("[Socket] TX status:", data);
      if (walletAddress) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byWallet(walletAddress),
        });

        // Refetch contract data when tx executed
        if (data.status === TxStatus.EXECUTED) {
          queryClient.invalidateQueries({
            queryKey: walletContractKeys.commitments(walletAddress),
          });
          queryClient.invalidateQueries({
            queryKey: walletContractKeys.threshold(walletAddress),
          });
        }
      }
    },
    [queryClient, walletAddress],
  );

  // Handle transaction voted
  const handleTxVoted = useCallback(
    (data: TxVotedEventData) => {
      console.log("[Socket] TX voted:", data);
      if (walletAddress) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byWallet(walletAddress),
        });
      }
    },
    [queryClient, walletAddress],
  );

  // Subscribe to socket events
  useSocketEvent(TX_CREATED_EVENT, handleTxCreated);
  useSocketEvent(TX_STATUS_EVENT, handleTxStatus);
  useSocketEvent(TX_VOTED_EVENT, handleTxVoted);
};
