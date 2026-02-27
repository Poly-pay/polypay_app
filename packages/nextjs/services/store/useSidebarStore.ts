import { create } from "zustand";

interface SidebarState {
  // Manage Accounts Sidebar
  isManageAccountsOpen: boolean;
  expandAccountId: string | null;

  // Network Chooser Sidebar
  isNetworkChooserOpen: boolean;
  selectedNetworkChainId: number | null;

  // Actions
  openManageAccounts: () => void;
  closeManageAccounts: () => void;
  openManageAccountsWithExpand: (accountId: string, chainId?: number) => void;
  setExpandAccountId: (accountId: string | null) => void;
  openNetworkChooser: () => void;
  closeNetworkChooser: () => void;
  openManageAccountsForChain: (chainId: number | null) => void;
  setSelectedNetworkChainId: (chainId: number | null) => void;
  resetSidebarState: () => void;
}

export const useSidebarStore = create<SidebarState>()(set => ({
  // Initial state
  isManageAccountsOpen: false,
  expandAccountId: null,
  isNetworkChooserOpen: false,
  selectedNetworkChainId: null,

  // Actions
  openManageAccounts: () =>
    set({
      isManageAccountsOpen: true,
      isNetworkChooserOpen: false,
    }),
  closeManageAccounts: () =>
    set({
      isManageAccountsOpen: false,
      isNetworkChooserOpen: false,
      expandAccountId: null,
      selectedNetworkChainId: null,
    }),
  openManageAccountsWithExpand: (accountId: string, chainId?: number) =>
    set({
      isManageAccountsOpen: true,
      expandAccountId: accountId,
      ...(chainId != null && { selectedNetworkChainId: chainId }),
    }),
  setExpandAccountId: (accountId: string | null) => set({ expandAccountId: accountId }),
  openNetworkChooser: () =>
    set({
      isNetworkChooserOpen: true,
      // keep manage sidebar closed by default when first opening chooser
      isManageAccountsOpen: false,
      selectedNetworkChainId: null,
      expandAccountId: null,
    }),
  closeNetworkChooser: () =>
    set({
      isNetworkChooserOpen: false,
      selectedNetworkChainId: null,
    }),
  openManageAccountsForChain: (chainId: number | null) =>
    set({
      // keep network chooser open so both sidebars are visible side by side
      isManageAccountsOpen: true,
      selectedNetworkChainId: chainId,
      expandAccountId: null,
    }),
  setSelectedNetworkChainId: (chainId: number | null) => set({ selectedNetworkChainId: chainId }),
  resetSidebarState: () =>
    set({
      isManageAccountsOpen: false,
      isNetworkChooserOpen: false,
      expandAccountId: null,
      selectedNetworkChainId: null,
    }),
}));
