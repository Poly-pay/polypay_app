import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletSigner {
  commitment: string;
  isCreator: boolean;
}

interface CurrentWallet {
  id: string;
  address: string;
  name: string;
  threshold: number;
  createdAt: string;
  signers: WalletSigner[];
}

interface WalletState {
  currentWallet: CurrentWallet | null;
  setCurrentWallet: (wallet: CurrentWallet) => void;
  clearCurrentWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      currentWallet: null,
      setCurrentWallet: (wallet: CurrentWallet) => set({ currentWallet: wallet }),
      clearCurrentWallet: () => set({ currentWallet: null }),
    }),
    {
      name: "wallet-storage",
    }
  )
);
