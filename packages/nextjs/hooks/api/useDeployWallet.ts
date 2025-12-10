import { useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { useCreateWallet } from "./useWallet";
import {
  METAMULTISIG_ABI,
  METAMULTISIG_BYTECODE,
  METAMULTISIG_CONSTANTS,
} from "~~/contracts/MetaMultiSigWallet";
import { useWalletStore } from "~~/services/store";

interface DeployWalletParams {
  name: string;
  commitments: string[];
  threshold: number;
  creatorCommitment: string;
}

interface DeployWalletResult {
  deploy: (params: DeployWalletParams) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export const useDeployWallet = (): DeployWalletResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { mutateAsync: createWalletInBackend } = useCreateWallet();
  const { setCurrentWallet } = useWalletStore();

  const deploy = async (params: DeployWalletParams): Promise<string> => {
    if (!walletClient) {
      throw new Error("Wallet not connected");
    }

    if (!publicClient) {
      throw new Error("Public client not available");
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Convert commitments to BigInt
      const commitmentsBigInt = params.commitments.map((c) => BigInt(c));

      // 2. Deploy contract
      const hash = await walletClient.deployContract({
        abi: METAMULTISIG_ABI,
        bytecode: METAMULTISIG_BYTECODE,
        args: [
          METAMULTISIG_CONSTANTS.zkVerifyAddress,
          METAMULTISIG_CONSTANTS.vkHash as `0x${string}`,
          BigInt(METAMULTISIG_CONSTANTS.chainId),
          commitmentsBigInt,
          BigInt(params.threshold),
        ],
      });

      // 3. Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (!receipt.contractAddress) {
        throw new Error("Contract deployment failed - no address returned");
      }

      const walletAddress = receipt.contractAddress;

      // 4. Save wallet to backend
      const wallet = await createWalletInBackend({
        address: walletAddress,
        name: params.name,
        threshold: params.threshold,
        commitments: params.commitments,
        creatorCommitment: params.creatorCommitment,
      });

      // 5. Set current wallet in zustand
      setCurrentWallet(wallet);

      return walletAddress;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Deploy failed");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { deploy, isLoading, error };
};
