import { Account } from "@polypay/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AccountState {
  currentAccount: Account | null;
  setCurrentAccount: (account: Account) => void;
  clearCurrentAccount: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    set => ({
      currentAccount: null,
      setCurrentAccount: (account: Account) => set({ currentAccount: account }),
      clearCurrentAccount: () => set({ currentAccount: null }),
    }),
    {
      name: "account-storage",
    },
  ),
);
