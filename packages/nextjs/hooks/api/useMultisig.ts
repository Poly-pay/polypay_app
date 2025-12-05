import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Types
export interface ProposeTxDto {
  txId: number;
  to: string;
  value: string;
  callData?: string;
  signaturesRequired: number;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  vk?: string;
}

export interface SignTxDto {
  txId: number;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  vk?: string;
}

export interface ZkProof {
  nullifier: string;
  aggregationId: string;
  domainId: number;
  zkMerklePath: string[];
  leafCount: number;
  index: number;
}

export interface ExecutionData {
  transaction: {
    txId: number;
    to: string;
    value: string;
    callData: string;
    status: string;
  };
  zkProofs: ZkProof[];
  signatureCount: number;
  signaturesRequired: number;
}

// ============ PROPOSE ============
export const useProposeTx = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ProposeTxDto) => {
      const { data } = await axios.post(`${API_URL}/api/zkverify/propose`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

// ============ SIGN ============
export const useSignTx = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: SignTxDto) => {
      const { data } = await axios.post(`${API_URL}/api/zkverify/sign`, dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transaction", variables.txId] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

// ============ EXECUTE ============
export const useGetProofsForExecution = (txId: number, enabled = true) => {
  return useQuery<ExecutionData>({
    queryKey: ["execution", txId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/zkverify/execute/${txId}`);
      return data;
    },
    enabled: enabled && txId >= 0,
  });
};

export const useMarkExecuted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (txId: number) => {
      const { data } = await axios.patch(`${API_URL}/api/zkverify/executed/${txId}`);
      return data;
    },
    onSuccess: (_, txId) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["execution", txId] });
    },
  });
};
