import { create } from "zustand";
import { persist } from "zustand/middleware";

// Dedicated store for the Arc (ECDSA multisig) JWT, issued by /arc/auth/login
// and guarded by ArcAuthGuard on the backend. Kept separate from
// useIdentityStore so an Arc login never overwrites the ZK session token.
interface ArcIdentityState {
  address: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setSession: (address: string, accessToken: string) => void;
  logout: () => void;
}

export const useArcIdentityStore = create<ArcIdentityState>()(
  persist(
    set => ({
      address: null,
      accessToken: null,
      isAuthenticated: false,

      setSession: (address: string, accessToken: string) => set({ address, accessToken, isAuthenticated: true }),

      logout: () => set({ address: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: "arc-identity-storage",
    },
  ),
);
