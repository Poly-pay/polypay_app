"use client";

import React from "react";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useWalletRealtime } from "~~/hooks";

const NewAccountPage = () => {
  useWalletRealtime();

  return <NewWalletContainer />;
};

export default NewAccountPage;
