import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IdentityState {
  commitment: string | null;
  setCommitment: (commitment: string) => void;
  clearCommitment: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      commitment: null,
      setCommitment: (commitment: string) => set({ commitment }),
      clearCommitment: () => set({ commitment: null }),
    }),
    {
      name: "identity-storage",
    }
  )
);
