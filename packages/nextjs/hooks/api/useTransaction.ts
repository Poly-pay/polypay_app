import { ApproveTransactionDto, DenyTransactionDto, TxStatus } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "~~/services/api";

export const transactionKeys = {
  all: ["transactions"] as const,
  byWallet: (walletAddress: string) => [...transactionKeys.all, walletAddress] as const,
  byWalletAndStatus: (walletAddress: string, status: TxStatus) =>
    [...transactionKeys.all, walletAddress, status] as const,
  byTxId: (txId: number) => [...transactionKeys.all, "detail", txId] as const,
  execution: (txId: number) => [...transactionKeys.all, "execution", txId] as const,
};

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

export const useTransactions = (walletAddress: string, status?: TxStatus) => {
  return useQuery({
    queryKey: status
      ? transactionKeys.byWalletAndStatus(walletAddress, status)
      : transactionKeys.byWallet(walletAddress),
    queryFn: () => transactionApi.getAll(walletAddress, status),
    enabled: !!walletAddress,
  });
};

export const useTransaction = (txId: number) => {
  return useQuery({
    queryKey: transactionKeys.byTxId(txId),
    queryFn: () => transactionApi.getById(txId),
    enabled: txId > 0,
  });
};

export const useApprove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: ApproveTransactionDto }) => transactionApi.approve(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

export const useDeny = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: DenyTransactionDto }) => transactionApi.deny(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

export const useMarkExecuted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, txHash }: { txId: number; txHash: string }) => transactionApi.markExecuted(txId, txHash),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

export const useExecuteOnChain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionApi.execute,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

export const useReserveNonce = () => {
  return useMutation({
    mutationFn: transactionApi.reserveNonce,
  });
};

export const usePendingTransactions = (walletAddress: string) => {
  return useTransactions(walletAddress, TxStatus.PENDING);
};
