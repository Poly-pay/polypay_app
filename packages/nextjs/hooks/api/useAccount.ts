import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, CreateAccountDto } from "@polypay/shared";

export interface AccountWallet {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  isCreator: boolean;
}

// ============ API Functions ============

const createAccountAPI = async (dto: CreateAccountDto): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/api/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create account");
  }

  return response.json();
};

const getAccountAPI = async (commitment: string): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/${commitment}`);

  if (!response.ok) {
    throw new Error("Failed to fetch account");
  }

  return response.json();
};

const getAccountWalletsAPI = async (commitment: string): Promise<AccountWallet[]> => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/${commitment}/wallets`);

  if (!response.ok) {
    throw new Error("Failed to fetch account wallets");
  }

  return response.json();
};

// ============ Query Keys ============

export const accountKeys = {
  all: ["accounts"] as const,
  byCommitment: (commitment: string) => [...accountKeys.all, commitment] as const,
  wallets: (commitment: string) => [...accountKeys.all, commitment, "wallets"] as const,
};

// ============ Hooks ============

/**
 * Create new account
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccountAPI,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.setQueryData(accountKeys.byCommitment(data.commitment), data);
    },
  });
};

/**
 * Get account by commitment
 */
export const useAccount = (commitment: string) => {
  return useQuery({
    queryKey: accountKeys.byCommitment(commitment),
    queryFn: () => getAccountAPI(commitment),
    enabled: !!commitment,
  });
};

/**
 * Get wallets for account
 */
export const useAccountWallets = (commitment: string) => {
  return useQuery({
    queryKey: accountKeys.wallets(commitment),
    queryFn: () => getAccountWalletsAPI(commitment),
    enabled: !!commitment,
  });
};
