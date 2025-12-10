import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IdentityState {
  secret: string | null;
  commitment: string | null;
  setIdentity: (secret: string, commitment: string) => void;
  clearIdentity: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      secret: null,
      commitment: null,
      setIdentity: (secret: string, commitment: string) => set({ secret, commitment }),
      clearIdentity: () => set({ secret: null, commitment: null }),
    }),
    {
      name: "identity-storage",
    }
  )
);
