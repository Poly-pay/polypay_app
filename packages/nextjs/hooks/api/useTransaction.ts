import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ============ Types ============

export type TxType = "TRANSFER" | "ADD_SIGNER" | "REMOVE_SIGNER" | "SET_THRESHOLD";
export type TxStatus = "PENDING" | "EXECUTING" | "EXECUTED" | "FAILED" | "OUTDATED";
export type VoteType = "APPROVE" | "DENY";
export type ProofStatus = "PENDING" | "AGGREGATED" | "FAILED";

export interface Vote {
  id: string;
  txId: number;
  voterCommitment: string;
  voteType: VoteType;
  nullifier: string | null;
  jobId: string | null;
  proofStatus: ProofStatus | null;
  aggregationId: string | null;
  domainId: number | null;
  merkleProof: string[];
  leafCount: number | null;
  leafIndex: number | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  txId: number;
  type: TxType;
  status: TxStatus;
  nonce: number;
  to: string | null;
  value: string | null;
  signerCommitment: string | null;
  newThreshold: number | null;
  createdBy: string;
  walletAddress: string;
  threshold: number;
  txHash: string | null;
  executedAt: string | null;
  createdAt: string;
  votes: Vote[];
}

export interface CreateTransactionDto {
  nonce: number;
  type: TxType;
  walletAddress: string;
  threshold: number;
  // Transfer
  to?: string;
  value?: string;
  // Add/Remove Signer
  signerCommitment?: string;
  // Set Threshold / Add / Remove
  newThreshold?: number;
  // Creator's proof (auto approve)
  creatorCommitment: string;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  vk?: string;
}

export interface ApproveDto {
  voterCommitment: string;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  vk?: string;
}

export interface DenyDto {
  voterCommitment: string;
  totalSigners: number;
}

export interface ExecutionData {
  txId: number;
  to: string;
  value: string;
  data: string;
  zkProofs: {
    nullifier: string;
    aggregationId: string;
    domainId: number;
    zkMerklePath: string[];
    leafCount: number;
    index: number;
  }[];
  threshold: number;
}

// ============ API Functions ============

const createTransactionAPI = async (
  dto: CreateTransactionDto,
): Promise<{
  nonce: number;
  type: TxType;
  status: TxStatus;
  jobId: string;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create transaction");
  }

  return response.json();
};

const getTransactionsAPI = async (walletAddress: string, status?: TxStatus): Promise<Transaction[]> => {
  const params = new URLSearchParams({ walletAddress });
  if (status) params.append("status", status);

  const response = await fetch(`${API_BASE_URL}/api/transactions?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json();
};

const getTransactionAPI = async (txId: number): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch transaction");
  }

  return response.json();
};

const approveAPI = async (
  txId: number,
  dto: ApproveDto,
): Promise<{
  txId: number;
  voteType: VoteType;
  jobId: string;
  status: TxStatus;
  approveCount: number;
  threshold: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve transaction");
  }

  return response.json();
};

const denyAPI = async (
  txId: number,
  dto: DenyDto,
): Promise<{
  txId: number;
  voteType: VoteType;
  status: TxStatus;
  denyCount: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/deny`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to deny transaction");
  }

  return response.json();
};

const getExecutionDataAPI = async (txId: number): Promise<ExecutionData> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/execute`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get execution data");
  }

  return response.json();
};

const markExecutedAPI = async (txId: number, txHash: string): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/executed`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark transaction as executed");
  }

  return response.json();
};

const executeOnChainAPI = async (
  txId: number,
): Promise<{
  txId: number;
  txHash: string;
  status: TxStatus;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${txId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to execute transaction");
  }

  return response.json();
};

// ============ Query Keys ============

export const transactionKeys = {
  all: ["transactions"] as const,
  byWallet: (walletAddress: string) => [...transactionKeys.all, walletAddress] as const,
  byWalletAndStatus: (walletAddress: string, status: TxStatus) =>
    [...transactionKeys.all, walletAddress, status] as const,
  byTxId: (txId: number) => [...transactionKeys.all, "detail", txId] as const,
  execution: (txId: number) => [...transactionKeys.all, "execution", txId] as const,
};

// ============ Hooks ============

/**
 * Create new transaction with auto-approve
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransactionAPI,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byWallet(variables.walletAddress),
      });
    },
  });
};

/**
 * Get all transactions for a wallet
 */
export const useTransactions = (walletAddress: string, status?: TxStatus) => {
  return useQuery({
    queryKey: status
      ? transactionKeys.byWalletAndStatus(walletAddress, status)
      : transactionKeys.byWallet(walletAddress),
    queryFn: () => getTransactionsAPI(walletAddress, status),
    enabled: !!walletAddress,
  });
};

/**
 * Get single transaction by txId
 */
export const useTransaction = (txId: number) => {
  return useQuery({
    queryKey: transactionKeys.byTxId(txId),
    queryFn: () => getTransactionAPI(txId),
    enabled: txId > 0,
  });
};

/**
 * Approve transaction with ZK proof
 */
export const useApprove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: ApproveDto }) => approveAPI(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Deny transaction (no proof needed)
 */
export const useDeny = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, dto }: { txId: number; dto: DenyDto }) => denyAPI(txId, dto),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Get execution data (proofs for smart contract)
 */
export const useExecutionData = (txId: number, enabled = false) => {
  return useQuery({
    queryKey: transactionKeys.execution(txId),
    queryFn: () => getExecutionDataAPI(txId),
    enabled: enabled && txId > 0,
  });
};

/**
 * Mark transaction as executed
 */
export const useMarkExecuted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txId, txHash }: { txId: number; txHash: string }) => markExecutedAPI(txId, txHash),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

/**
 * Execute transaction on-chain via relayer
 */
export const useExecuteOnChain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (txId: number) => executeOnChainAPI(txId),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.byTxId(data.txId) });
    },
  });
};

// ============ Utility Hooks ============

/**
 * Get pending transactions for a wallet
 */
export const usePendingTransactions = (walletAddress: string) => {
  return useTransactions(walletAddress, "PENDING");
};

/**
 * Get executing transactions for a wallet
 */
export const useExecutingTransactions = (walletAddress: string) => {
  return useTransactions(walletAddress, "EXECUTING");
};
