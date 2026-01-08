const Routes = {
  DASHBOARD: {
    path: "/dashboard",
    name: "dashboard",
    title: "Dashboard",
    icon: "/sidebar/dashboard.svg",
    subroutes: {
      NEW_ACCOUNT: {
        path: "/dashboard/new-account",
        name: "new-account",
        title: "New Account",
      },
    },
  },
  CONTACT_BOOK: {
    path: "/contact-book",
    name: "contact-book",
    title: "Contact Book",
    icon: "/sidebar/contact-book.svg",
  },
  TRANSFER: {
    path: "/transfer",
    name: "transfer",
    title: "Transfer",
    icon: "/sidebar/transfer.svg",
  },
  BATCH: {
    path: "/batch",
    name: "batch",
    title: "Batch",
    icon: "/sidebar/batch.svg",
  },
  MOBILE: {
    path: "/mobile",
    name: "mobile",
    title: "Mobile",
  },
} as const;

export default Routes;
