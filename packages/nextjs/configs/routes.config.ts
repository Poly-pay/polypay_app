const Routes = {
  DASHBOARD: {
    path: "/dashboard",
    name: "dashboard",
    title: "Dashboard",
    icon: "/sidebar/dashboard.svg",
    subroutes: {
      NEW_WALLET: {
        path: "/dashboard/new-wallet",
        name: "new-wallet",
        title: "New Wallet",
      },
    },
  },
  ADDRESS_BOOK: {
    path: "/address-book",
    name: "address-book",
    title: "Address Book",
    icon: "/sidebar/address-book.svg",
  },
  AI_ASSISTANT: {
    path: "/ai-assistant",
    name: "ai-assistant",
    title: "AI Assistant",
    icon: "/sidebar/ai-assistant.svg",
    coming: true,
  },
  TRANSFER: {
    path: "/transfer",
    name: "transfer",
    title: "Transfer",
    icon: "/sidebar/transfer.svg",
  },
  SWAP: {
    path: "/swap",
    name: "swap",
    title: "Swap",
    icon: "/sidebar/swap.svg",
    coming: true,
  },
  BATCH: {
    path: "/batch",
    name: "batch",
    title: "Batch",
    icon: "/sidebar/batch.svg",
  },
  TRANSACTIONS: {
    path: "/transactions",
    name: "transactions",
    title: "Transactions",
    icon: "/sidebar/transaction.svg",
    coming: true,
  },
  MOBILE: {
    path: "/mobile",
    name: "mobile",
    title: "Mobile",
  },
  VETKEYS: {
    path: "/vetkeys",
    name: "vetkeys",
    title: "VetKeys",
    coming: true,
  },
} as const;

export default Routes;
