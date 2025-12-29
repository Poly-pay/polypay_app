import { useMemo } from "react";
import { METAMULTISIG_ABI } from "@polypay/shared";
import { getContract } from "viem";
import { usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { useWalletStore } from "~~/services/store/useWalletStore";

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

export const useWalletThreshold = () => {
  const { currentWallet } = useWalletStore();

  return useReadContract({
    address: currentWallet?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "signaturesRequired",
    query: {
      enabled: !!currentWallet?.address,
    },
  });
};

export const useWalletCommitments = () => {
  const { currentWallet } = useWalletStore();

  return useReadContract({
    address: currentWallet?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "getCommitments",
    query: {
      enabled: !!currentWallet?.address,
    },
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
