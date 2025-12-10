"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Common/Sidebar";
import Title from "./Common/Title";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useEnforceSepolia } from "~~/hooks/api";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { useMobileDetection } from "~~/hooks/useMobileDetection";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  useMobileDetection();
  useEnforceSepolia();

  return (
    <>
      <div className="h-screen">
        {/* Sidebar fixed */}
        <aside className="fixed top-0 left-0 h-screen w-[300px] z-50 p-2">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="ml-[300px] p-2 h-screen">
          <div className="flex flex-col gap-2 w-full h-full">
            <Title />
            <div className="flex flex-col w-full flex-1 rounded-lg bg-white overflow-auto">{children}</div>
          </div>
        </main>
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ProgressBar height="3px" color="#2299dd" />
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
