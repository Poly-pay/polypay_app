import { useMemo } from "react";
import { getContract } from "viem";
import { usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { METAMULTISIG_ABI } from "~~/contracts/MetaMultiSigWallet";
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

// ============ Read Contract Hooks ============

export const useWalletMerkleRoot = () => {
  const { currentWallet } = useWalletStore();

  return useReadContract({
    address: currentWallet?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "merkleRoot",
    query: {
      enabled: !!currentWallet?.address,
    },
  });
};

export const useWalletNonce = () => {
  const { currentWallet } = useWalletStore();

  return useReadContract({
    address: currentWallet?.address as `0x${string}`,
    abi: METAMULTISIG_ABI,
    functionName: "nonce",
    query: {
      enabled: !!currentWallet?.address,
    },
  });
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

export const useWalletExecute = () => {
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { currentWallet } = useWalletStore();

  const execute = async (to: `0x${string}`, value: bigint, data: `0x${string}`, zkProofs: any[]) => {
    if (!metaMultiSigWallet || !publicClient || !walletClient || !currentWallet) {
      throw new Error("Contract or wallet not available");
    }

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: currentWallet.address as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: "execute",
      args: [to, value, data, zkProofs],
      account: walletClient.account,
    });

    // Execute with gas buffer
    const txHash = await metaMultiSigWallet.write.execute([to, value, data, zkProofs], { gas: gasEstimate + 10000n });

    return txHash;
  };

  return { execute };
};
