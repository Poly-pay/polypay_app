import { useMemo } from "react";
import { METAMULTISIG_ABI } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { getContract } from "viem";
import { usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { useAccountStore } from "~~/services/store/useAccountStore";

// Query keys
export const accountContractKeys = {
  all: ["accountContract"] as const,
  commitments: (address: string) => [...accountContractKeys.all, "commitments", address] as const,
  threshold: (address: string) => [...accountContractKeys.all, "threshold", address] as const,
};

export const useMetaMultiSigWallet = () => {
  const { currentAccount } = useAccountStore();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const contract = useMemo(() => {
    // Require walletClient for write operations
    if (!currentAccount?.address || !publicClient || !walletClient) {
      return null;
    }

    return getContract({
      address: currentAccount.address as `0x${string}`,
      abi: METAMULTISIG_ABI,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }, [currentAccount?.address, publicClient, walletClient]);

  return contract;
};

// ============ Contract Info Hook ============

export const useMetaMultiSigWalletInfo = () => {
  const { currentAccount } = useAccountStore();

  return {
    address: currentAccount?.address as `0x${string}` | undefined,
    abi: METAMULTISIG_ABI,
  };
};

export const useWalletCommitments = () => {
  const { currentAccount } = useAccountStore();
  const publicClient = usePublicClient();
  const address = currentAccount?.address || "";

  return useQuery({
    queryKey: accountContractKeys.commitments(address),
    queryFn: async () => {
      if (!address || !publicClient) return [];
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: METAMULTISIG_ABI,
        functionName: "getCommitments",
      });
      return result as bigint[];
    },
    enabled: !!address && !!publicClient,
  });
};

export const useWalletThreshold = () => {
  const { currentAccount } = useAccountStore();
  const publicClient = usePublicClient();
  const address = currentAccount?.address || "";

  return useQuery({
    queryKey: accountContractKeys.threshold(address),
    queryFn: async () => {
      if (!address || !publicClient) return 0n;
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: METAMULTISIG_ABI,
        functionName: "signaturesRequired",
      });
      return result as bigint;
    },
    enabled: !!address && !!publicClient,
  });
};

export const useWalletSignersCount = () => {
  const { currentAccount } = useAccountStore();

  return useReadContract({
    address: currentAccount?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "getSignersCount",
    query: {
      enabled: !!currentAccount?.address,
    },
  });
};
