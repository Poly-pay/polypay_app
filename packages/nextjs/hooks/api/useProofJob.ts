import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ============ Types ============

export interface CreateProofJobDto {
  txId: number;
  nullifier: string;
  jobId: string;
}

export interface UpdateAggregationDto {
  txId: number;
  aggregationId: string;
  merkleProof: string[];
  leafCount: number;
  leafIndex: number;
  domainId?: number;
}

export type JobStatus = "PENDING" | "VERIFIED" | "AGGREGATED" | "FAILED";

export interface ProofJob {
  id: string;
  txId: number;
  nullifier: string;
  jobId: string;
  status: JobStatus;
  aggregationId: string | null;
  domainId: number | null;
  merkleProof: string[];
  leafCount: number | null;
  leafIndex: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AggregationData {
  nullifier: string;
  aggregationId: string;
  domainId: number;
  merkleProof: string[];
  leafCount: number;
  leafIndex: number;
}

interface ProofJobResponse {
  success: boolean;
  data: ProofJob;
  message?: string;
}

interface ProofJobsResponse {
  success: boolean;
  data: ProofJob[];
  count: number;
}

interface AggregationsResponse {
  success: boolean;
  data: AggregationData[];
  count: number;
}

interface CountResponse {
  success: boolean;
  data: {
    txId: number;
    aggregatedCount: number;
  };
}

// ============ API Functions ============

const createProofJobAPI = async (data: CreateProofJobDto): Promise<ProofJob> => {
  const response = await fetch(`${API_BASE_URL}/api/proof-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create proof job: ${response.statusText}`);
  }

  const result: ProofJobResponse = await response.json();
  return result.data;
};

const getProofJobsByTxId = async (txId: number): Promise<ProofJob[]> => {
  const response = await fetch(`${API_BASE_URL}/api/proof-jobs/by-tx/${txId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch proof jobs: ${response.statusText}`);
  }

  const result: ProofJobsResponse = await response.json();
  return result.data;
};

const getAggregationsAPI = async (txId: number): Promise<AggregationData[]> => {
  const response = await fetch(`${API_BASE_URL}/api/proof-jobs/aggregations/${txId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch aggregations: ${response.statusText}`);
  }

  const result: AggregationsResponse = await response.json();
  return result.data;
};

const getAggregatedCountAPI = async (txId: number): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/api/proof-jobs/count/${txId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch count: ${response.statusText}`);
  }

  const result: CountResponse = await response.json();
  return result.data.aggregatedCount;
};

const deleteProofJobAPI = async (jobId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/proof-jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete proof job: ${response.statusText}`);
  }
};

// ============ Query Keys ============

export const proofJobKeys = {
  all: ["proofJobs"] as const,
  byJobId: (jobId: string) => [...proofJobKeys.all, "job", jobId] as const,
  byTxId: (txId: number) => [...proofJobKeys.all, "tx", txId] as const,
  byNullifier: (nullifier: string) => [...proofJobKeys.all, "nullifier", nullifier] as const,
  aggregations: (txId: number) => [...proofJobKeys.all, "aggregations", txId] as const,
  count: (txId: number) => [...proofJobKeys.all, "count", txId] as const,
};

// ============ React Query Hooks ============

export const useCreateProofJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProofJobAPI,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: proofJobKeys.byTxId(data.txId) });
      queryClient.invalidateQueries({ queryKey: proofJobKeys.count(data.txId) });
    },
    onError: error => {
      console.error("Create proof job error:", error);
    },
  });
};


export const useProofJobsByTxId = (txId: number) => {
  return useQuery({
    queryKey: proofJobKeys.byTxId(txId),
    queryFn: () => getProofJobsByTxId(txId),
    enabled: txId !== undefined && txId !== null,
  });
};

export const useAggregations = (txId: number) => {
  return useQuery({
    queryKey: proofJobKeys.aggregations(txId),
    queryFn: () => getAggregationsAPI(txId),
    enabled: txId !== undefined && txId !== null,
  });
};

export const useAggregatedCount = (txId: number) => {
  return useQuery({
    queryKey: proofJobKeys.count(txId),
    queryFn: () => getAggregatedCountAPI(txId),
    enabled: txId !== undefined && txId !== null,
  });
};

export const useDeleteProofJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProofJobAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proofJobKeys.all });
    },
    onError: error => {
      console.error("Delete proof job error:", error);
    },
  });
};
