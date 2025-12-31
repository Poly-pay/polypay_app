import { useCallback, useState } from "react";
import { useAuthProof } from "./useAuthProof";
import { authApi } from "~~/services/api";
import { useIdentityStore } from "~~/services/store";

export const useAuth = () => {
  const { generateAuthProof, isGenerating } = useAuthProof();
  const { isAuthenticated, accessToken, refreshToken, commitment, setTokens, logout: storeLogout } = useIdentityStore();

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
      });

      // 3. Store tokens
      setTokens(data.accessToken, data.refreshToken);

      return true;
    } catch (err: any) {
      setError(err.message || "Login failed");
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [generateAuthProof, setTokens]);

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
