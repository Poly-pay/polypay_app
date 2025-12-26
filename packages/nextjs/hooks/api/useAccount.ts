import { Account, CreateAccountDto, UpdateAccountDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "~~/constants";

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

const updateAccountAPI = async (commitment: string, dto: UpdateAccountDto): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/${commitment}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update account");
  }

  return response.json();
};

const getAccountsAPI = async (): Promise<Account[]> => {
  const response = await fetch(`${API_BASE_URL}/api/accounts`);

  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
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
    onSuccess: data => {
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

/**
 * Update account
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commitment, dto }: { commitment: string; dto: UpdateAccountDto }) =>
      updateAccountAPI(commitment, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.byCommitment(variables.commitment) });
      queryClient.invalidateQueries({ queryKey: accountKeys.wallets(variables.commitment) });
    },
  });
};

export const useAccounts = () => {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: getAccountsAPI,
  });
};
