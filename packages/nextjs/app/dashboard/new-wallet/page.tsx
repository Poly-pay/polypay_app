"use client";

import React, { useEffect } from "react";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useWalletRealtime } from "~~/hooks";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useWalletStore } from "~~/services/store";

const NewAccountPage = () => {
  const router = useAppRouter();
  const { currentWallet } = useWalletStore();
  useWalletRealtime();

  useEffect(() => {
    if (currentWallet) {
      router.goToDashboard();
    }
  }, [currentWallet, router]);

  return <NewWalletContainer />;
};

export default NewAccountPage;
