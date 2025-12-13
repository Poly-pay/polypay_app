import { Wallet } from "@polypay/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  currentWallet: Wallet | null;
  setCurrentWallet: (wallet: Wallet) => void;
  clearCurrentWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    set => ({
      currentWallet: null,
      setCurrentWallet: (wallet: Wallet) => set({ currentWallet: wallet }),
      clearCurrentWallet: () => set({ currentWallet: null }),
    }),
    {
      name: "wallet-storage",
    },
  ),
);
