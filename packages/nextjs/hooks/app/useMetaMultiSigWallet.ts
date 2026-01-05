import { useMemo } from "react";
import { METAMULTISIG_ABI } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { getContract } from "viem";
import { usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { useWalletStore } from "~~/services/store/useWalletStore";

// Query keys
export const walletContractKeys = {
  all: ["walletContract"] as const,
  commitments: (address: string) => [...walletContractKeys.all, "commitments", address] as const,
  threshold: (address: string) => [...walletContractKeys.all, "threshold", address] as const,
};

export const useMetaMultiSigWallet = () => {
  const { currentWallet } = useWalletStore();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const contract = useMemo(() => {
    // Require walletClient for write operations
    if (!currentWallet?.address || !publicClient || !walletClient) {
      return null;
    }

    return getContract({
      address: currentWallet.address as `0x${string}`,
      abi: METAMULTISIG_ABI,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }, [currentWallet?.address, publicClient, walletClient]);

  return contract;
};

// ============ Contract Info Hook ============

export const useMetaMultiSigWalletInfo = () => {
  const { currentWallet } = useWalletStore();

  return {
    address: currentWallet?.address as `0x${string}` | undefined,
    abi: METAMULTISIG_ABI,
  };
};

export const useWalletCommitments = () => {
  const { currentWallet } = useWalletStore();
  const publicClient = usePublicClient();
  const address = currentWallet?.address || "";

  return useQuery({
    queryKey: walletContractKeys.commitments(address),
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
  const { currentWallet } = useWalletStore();
  const publicClient = usePublicClient();
  const address = currentWallet?.address || "";

  return useQuery({
    queryKey: walletContractKeys.threshold(address),
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
  const { currentWallet } = useWalletStore();

  return useReadContract({
    address: currentWallet?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "getSignersCount",
    query: {
      enabled: !!currentWallet?.address,
    },
  });
};
