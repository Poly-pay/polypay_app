import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IdentityState {
  // Identity
  secret: string | null;
  commitment: string | null;

  // Auth tokens
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setIdentity: (secret: string, commitment: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearIdentity: () => void;
  logout: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    set => ({
      // Identity
      secret: null,
      commitment: null,

      // Auth tokens
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Actions
      setIdentity: (secret: string, commitment: string) => set({ secret, commitment }),

      setTokens: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      clearIdentity: () => set({ secret: null, commitment: null }),

      logout: () =>
        set({
          secret: null,
          commitment: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "identity-storage",
    },
  ),
);
