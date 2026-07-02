import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { arcApi } from "~~/services/api";
import { useArcIdentityStore } from "~~/services/store";
import { formatErrorMessage } from "~~/utils/formatError";

// Arc login is a nonce-challenge signature flow, separate from the ZK proof
// login in useAuth.ts: fetch a one-time nonce for the connected address,
// sign `PolyPay Arc login: <nonce>` (must match arc-auth.service.ts exactly),
// then exchange the signature for an Arc-scoped JWT (ArcAuthGuard).
export const useArcAuth = () => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { isAuthenticated, accessToken, setSession, logout: storeLogout } = useArcIdentityStore();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError("Wallet not connected");
      return false;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      const nonce = await arcApi.getNonce(address);
      const signature = await signMessageAsync({ message: `PolyPay Arc login: ${nonce}` });
      const { accessToken: token } = await arcApi.login(address, signature);

      setSession(address, token);
      return true;
    } catch (err: any) {
      setError(formatErrorMessage(err, "Arc login failed"));
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [address, signMessageAsync, setSession]);

  return {
    isAuthenticated,
    accessToken,
    address,
    login,
    logout: storeLogout,
    isLoading: isLoggingIn,
    error,
  };
};
