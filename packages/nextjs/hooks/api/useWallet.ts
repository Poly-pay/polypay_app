import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys } from "./useAccount";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ============ Types ============

export interface WalletSigner {
  commitment: string;
  isCreator: boolean;
}

export interface Wallet {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  signers: WalletSigner[];
}

export interface CreateWalletDto {
  name: string;
  threshold: number;
  commitments: string[];
  creatorCommitment: string;
}

// ============ API Functions ============

const createWalletAPI = async (dto: CreateWalletDto): Promise<Wallet> => {
  const response = await fetch(`${API_BASE_URL}/api/wallets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create wallet");
  }

  return response.json();
};

const getWalletAPI = async (address: string): Promise<Wallet> => {
  const response = await fetch(`${API_BASE_URL}/api/wallets/${address}`);

  if (!response.ok) {
    throw new Error("Failed to fetch wallet");
  }

  return response.json();
};

const getWalletsAPI = async (): Promise<Wallet[]> => {
  const response = await fetch(`${API_BASE_URL}/api/wallets`);

  if (!response.ok) {
    throw new Error("Failed to fetch wallets");
  }

  return response.json();
};

// ============ Query Keys ============

export const walletKeys = {
  all: ["wallets"] as const,
  byAddress: (address: string) => [...walletKeys.all, address] as const,
};

// ============ Hooks ============

/**
 * Create new wallet
 */
export const useCreateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWalletAPI,
    onSuccess: (data, variables) => {
      // Invalidate wallet queries
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
      queryClient.setQueryData(walletKeys.byAddress(data.address), data);

      // Invalidate account wallets for all signers
      variables.commitments.forEach((commitment) => {
        queryClient.invalidateQueries({ queryKey: accountKeys.wallets(commitment) });
      });
    },
  });
};

/**
 * Get wallet by address
 */
export const useWallet = (address: string) => {
  return useQuery({
    queryKey: walletKeys.byAddress(address),
    queryFn: () => getWalletAPI(address),
    enabled: !!address,
  });
};

/**
 * Get all wallets
 */
export const useWallets = () => {
  return useQuery({
    queryKey: walletKeys.all,
    queryFn: getWalletsAPI,
  });
};
