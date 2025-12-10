import { useMutation } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface SubmitProofDto {
  proof: number[];
  publicInputs: string[];
  vk?: string;
}

export interface ZkVerifyResult {
  status: string;
  jobId: string;
  aggregationId?: string;
  aggregationDetails?: {
    merkleProof: string[];
    numberOfLeaves: number;
    leafIndex: number;
  };
}

const submitProofAPI = async (data: SubmitProofDto): Promise<ZkVerifyResult> => {
  const response = await fetch(`${API_BASE_URL}/api/zkverify/submit-proof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to submit proof");
  }

  const result = await response.json();
  return result.data;
};

const getJobStatusAPI = async (jobId: string): Promise<ZkVerifyResult> => {
  const response = await fetch(`${API_BASE_URL}/api/zkverify/job-status/${jobId}`);

  if (!response.ok) {
    throw new Error("Failed to get job status");
  }

  const result = await response.json();
  return result.data;
};

export const useSubmitProof = () => {
  return useMutation({
    mutationFn: submitProofAPI,
    onError: error => {
      console.error("Submit proof error:", error);
    },
  });
};

export const useGetJobStatus = () => {
  return useMutation({
    mutationFn: getJobStatusAPI,
    onError: error => {
      console.error("Get job status error:", error);
    },
  });
};