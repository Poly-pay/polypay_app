"use client";

import React, { useEffect } from "react";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useWalletStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

const NewAccountPage = () => {
  const router = useAppRouter();
  const { currentWallet } = useWalletStore();

  useEffect(() => {
    if (currentWallet) {
      notification.info("Wallet already exists! Cannot create a new one.");
      router.goToDashboard();
    }
  }, [currentWallet, router]);

  return <NewWalletContainer />;
};

export default NewAccountPage;
