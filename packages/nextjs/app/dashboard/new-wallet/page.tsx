"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useWalletStore } from "~~/services/store";

const NewAccountPage = () => {
  const router = useRouter();
  const { currentWallet } = useWalletStore();

  useEffect(() => {
    if (currentWallet) {
      router.push("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <NewWalletContainer />;
};

export default NewAccountPage;
