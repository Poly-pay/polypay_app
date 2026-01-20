import { create } from "zustand";

interface SidebarState {
  // Manage Accounts Sidebar
  isManageAccountsOpen: boolean;
  expandAccountId: string | null;

  // Actions
  openManageAccounts: () => void;
  closeManageAccounts: () => void;
  openManageAccountsWithExpand: (accountId: string) => void;
  setExpandAccountId: (accountId: string | null) => void;
  resetSidebarState: () => void;
}

export const useSidebarStore = create<SidebarState>()(set => ({
  // Initial state
  isManageAccountsOpen: false,
  expandAccountId: null,

  // Actions
  openManageAccounts: () => set({ isManageAccountsOpen: true }),
  closeManageAccounts: () => set({ isManageAccountsOpen: false, expandAccountId: null }),
  openManageAccountsWithExpand: (accountId: string) =>
    set({
      isManageAccountsOpen: true,
      expandAccountId: accountId,
    }),
  setExpandAccountId: (accountId: string | null) => set({ expandAccountId: accountId }),
  resetSidebarState: () => set({ isManageAccountsOpen: false, expandAccountId: null }),
}));
