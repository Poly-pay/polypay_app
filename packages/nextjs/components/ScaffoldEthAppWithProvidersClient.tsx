"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "./Common/BackButton";
import Title from "./Common/Title";
import { InitializeApp } from "./InitializeApp";
import Sidebar from "./Sidebar/Sidebar";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import Routes from "~~/configs/routes.config";
import { useCommitmentGuard, useEnforceNetwork, useMyAccounts } from "~~/hooks";
import { useMobileDetection } from "~~/hooks/app/useMobileDetection";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useSocketConnection } from "~~/hooks/app/useSocketConnection";
import { queryClient } from "~~/services/queryClient";
import { useIdentityStore } from "~~/services/store";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useMobileDetection();
  useEnforceNetwork();
  useSocketConnection();
  useCommitmentGuard();

  const { pathname } = useAppRouter();
  const { data: accounts } = useMyAccounts();
  const { commitment } = useIdentityStore();

  const initialAccountCountRef = useRef<number | null>(null);

  // Detect flow
  const isNewAccountPage = pathname === Routes.DASHBOARD.subroutes.NEW_ACCOUNT.path;
  const wasOnboarding = initialAccountCountRef.current === 0;
  // hide sidebar if on new account page and user has at least one account
  const shouldHideSidebar = isNewAccountPage && !wasOnboarding && accounts && accounts.length > 0 && commitment;

  useEffect(() => {
    if (isNewAccountPage && accounts !== undefined) {
      if (initialAccountCountRef.current === null) {
        initialAccountCountRef.current = accounts.length;
      }
    } else {
      // Reset when leaving new-account page
      initialAccountCountRef.current = null;
    }
  }, [isNewAccountPage, accounts]);

  return (
    <>
      <InitializeApp>
        <div className="h-screen flex overflow-hidden">
          {/* Sidebar - hidden when on new account page and user has accounts */}
          {!shouldHideSidebar && (
            <aside className="shrink-0 max-h-screen p-3">
              <Sidebar />
            </aside>
          )}

          {/* Main content */}
          <main className={`flex-1 ${shouldHideSidebar ? "p-3" : "py-3 pr-3"}`}>
            <section className="flex flex-col gap-2 h-full max-h-screen">
              {/* Title row with Back button */}
              <div className="flex items-center gap-2">
                {shouldHideSidebar && <BackButton />}
                <Title />
              </div>

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

const ScaffoldEthAppWithProvidersClient = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}>
          <ProgressBar height="3px" color="#2299dd" />
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default ScaffoldEthAppWithProvidersClient;
