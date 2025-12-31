import { useState, useCallback } from "react";
import { useAuthProof } from "./useAuthProof";
import { LoginResponse } from "@polypay/shared";
import { useIdentityStore } from "~~/services/store";
import { API_BASE_URL } from "~~/constants";

export const useAuth = () => {
  const { generateAuthProof, isGenerating } = useAuthProof();
  const {
    isAuthenticated,
    accessToken,
    refreshToken,
    commitment,
    setTokens,
    logout: storeLogout,
  } = useIdentityStore();

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
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitment: proofResult.commitment,
          proof: proofResult.proof,
          publicInputs: proofResult.publicInputs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data: LoginResponse = await response.json();

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
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        storeLogout();
        return false;
      }

      const data = await response.json();
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
