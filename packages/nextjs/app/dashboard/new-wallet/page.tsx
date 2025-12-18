"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useWalletStore } from "~~/services/store";
import { notification } from "~~/utils/scaffold-eth";

const NewAccountPage = () => {
  const router = useRouter();
  const { currentWallet } = useWalletStore();

  useEffect(() => {
    if (currentWallet) {
      notification.info("Wallet already exists! Cannot create a new one.");
      router.push("/dashboard");
    }
  }, []);

  return <NewWalletContainer />;
};

export default NewAccountPage;
