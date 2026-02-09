"use client";

import dynamic from "next/dynamic";

const ScaffoldEthAppWithProvidersClient = dynamic(() => import("./ScaffoldEthAppWithProvidersClient"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return <ScaffoldEthAppWithProvidersClient>{children}</ScaffoldEthAppWithProvidersClient>;
};
