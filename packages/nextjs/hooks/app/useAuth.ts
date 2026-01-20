import { useCallback, useState } from "react";
import { userKeys } from "../api";
import { useAuthProof } from "./useAuthProof";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "~~/services/api";
import { useIdentityStore } from "~~/services/store";

export const useAuth = () => {
  const { generateAuthProof, isGenerating } = useAuthProof();
  const {
    isAuthenticated,
    accessToken,
    refreshToken,
    commitment,
    setIdentity,
    setTokens,
    logout: storeLogout,
  } = useIdentityStore();

  const queryClient = useQueryClient();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (): Promise<boolean> => {
    setIsLoggingIn(true);
    setError(null);

    try {
      // 1. Generate auth proof
      const proofResult = await generateAuthProof();
      if (!proofResult) {
        setError("Failed to generate proof");
        return false;
      }

      // 2. Call login API
      const data = await authApi.login({
        commitment: proofResult.commitment,
        proof: proofResult.proof,
        publicInputs: proofResult.publicInputs,
        vk: Buffer.from(proofResult.vk).toString("base64"),
        walletAddress: proofResult.walletAddress, // For analytics only
      });

      // 3. Store tokens and identity
      setIdentity(proofResult.secret, proofResult.commitment);
      setTokens(data.accessToken, data.refreshToken);

      // Invalidate me query to fetch latest account info
      queryClient.invalidateQueries({ queryKey: userKeys.me });

      return true;
    } catch (err: any) {
      setError(err.message || "Login failed");
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [generateAuthProof, setTokens, setIdentity]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      return false;
    }

    try {
      const data = await authApi.refresh({ refreshToken });
      setTokens(data.accessToken, data.refreshToken);

      return true;
    } catch {
      storeLogout();
      return false;
    }
  }, [refreshToken, setTokens, storeLogout]);

  return {
    isAuthenticated,
    accessToken,
    commitment,
    login,
    logout: storeLogout,
    refresh,
    isLoading: isGenerating || isLoggingIn,
    error,
  };
};
