"use client";

import { useEffect, useState } from "react";
import Title from "./Common/Title";
import { InitializeApp } from "./InitializeApp";
import Sidebar from "./Sidebar/Sidebar";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useCommitmentGuard, useEnforceNetwork } from "~~/hooks";
import { useMobileDetection } from "~~/hooks/app/useMobileDetection";
import { useSocketConnection } from "~~/hooks/app/useSocketConnection";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { queryClient } from "~~/services/queryClient";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  useMobileDetection();
  useEnforceNetwork();
  useSocketConnection();
  useCommitmentGuard();

  return (
    <>
      <InitializeApp>
        <div className="h-screen grid grid-cols-12 overflow-hidden">
          {/* Sidebar fixed */}
          <aside className="xl:col-span-2 col-span-1 max-h-screen">
            <Sidebar />
          </aside>
          {/* Main content */}
          <main className="xl:col-span-10 col-span-11 py-3 pr-3">
            <section className="flex flex-col gap-2 h-full max-h-screen">
              <Title />
              <div className="flex-1 content h-full rounded-lg bg-white overflow-auto animate-height-smooth">
                {children}
              </div>
            </section>
          </main>
        </div>
        <Toaster />
      </InitializeApp>
    </>
  );
};

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
