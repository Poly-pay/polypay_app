"use client";

import { ARC_TESTNET_CHAIN_ID, META_MULTISIG_ARC_ABI } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { usePublicClient, useSignMessage } from "wagmi";
import { ArcAccount, ArcTransaction, arcApi } from "~~/services/api";
import { useArcIdentityStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

// Arc's contract getTransactionHash/verify are proven to match the backend's
// viem encodePacked hash for identical inputs (verified on Arc testnet), so
// reading the hash straight from the contract and signing it raw is safe -
// no need to recompute it client-side.

export const arcTransactionKeys = {
  all: ["arcTransactions"] as const,
  byAccount: (accountId: string) => [...arcTransactionKeys.all, accountId] as const,
};

export const useArcTransactions = (accountId: string | undefined) => {
  const { isAuthenticated } = useArcIdentityStore();

  return useQuery({
    queryKey: arcTransactionKeys.byAccount(accountId ?? ""),
    queryFn: () => arcApi.getTransactions(accountId as string),
    enabled: isAuthenticated && !!accountId,
  });
};

export const useArcTransfer = () => {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const { signMessageAsync } = useSignMessage();

  const readTxHash = async (
    accountAddress: string,
    nonce: number,
    to: string,
    value: bigint,
    data: "0x",
  ): Promise<`0x${string}`> => {
    if (!publicClient) {
      throw new Error("Arc RPC client is not available");
    }
    return publicClient.readContract({
      address: accountAddress as `0x${string}`,
      abi: META_MULTISIG_ARC_ABI,
      functionName: "getTransactionHash",
      args: [BigInt(nonce), to as `0x${string}`, value, data],
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: arcTransactionKeys.all });

  const proposeMutation = useMutation({
    mutationFn: async ({ account, to, amount }: { account: ArcAccount; to: string; amount: string }) => {
      const { nonce } = await arcApi.nextNonce(account.id);
      const value = parseUnits(amount, 18);
      const txHash = await readTxHash(account.address, nonce, to, value, "0x");
      const signature = await signMessageAsync({ message: { raw: txHash } });

      return arcApi.proposeTx({
        accountId: account.id,
        to,
        value: value.toString(),
        data: "0x",
        signature,
      });
    },
    onSuccess: () => {
      invalidate();
      notification.success("Arc transaction proposed!");
    },
    onError: err => {
      notification.error(formatErrorMessage(err, "Failed to propose Arc transaction"));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ account, tx }: { account: ArcAccount; tx: ArcTransaction }) => {
      const txHash = await readTxHash(account.address, tx.nonce, tx.to, BigInt(tx.value), tx.data);
      const signature = await signMessageAsync({ message: { raw: txHash } });

      return arcApi.approveTx(tx.id, { signature });
    },
    onSuccess: () => {
      invalidate();
      notification.success("Arc transaction approved!");
    },
    onError: err => {
      notification.error(formatErrorMessage(err, "Failed to approve Arc transaction"));
    },
  });

  const executeMutation = useMutation({
    mutationFn: (tx: ArcTransaction) => arcApi.executeTx(tx.id),
    onSuccess: () => {
      invalidate();
      notification.success("Arc transaction executed!");
    },
    onError: err => {
      notification.error(formatErrorMessage(err, "Failed to execute Arc transaction"));
    },
  });

  return {
    propose: (account: ArcAccount, to: string, amount: string) => proposeMutation.mutateAsync({ account, to, amount }),
    approve: (account: ArcAccount, tx: ArcTransaction) => approveMutation.mutateAsync({ account, tx }),
    execute: (tx: ArcTransaction) => executeMutation.mutateAsync(tx),
    isProposing: proposeMutation.isPending,
    isApproving: approveMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
};
