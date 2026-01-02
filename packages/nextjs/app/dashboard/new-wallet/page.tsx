"use client";

import React, { useEffect } from "react";
import NewWalletContainer from "~~/components/NewAccount/NewWalletContainer";
import { useWalletRealtime } from "~~/hooks";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useWalletStore } from "~~/services/store";

const NewAccountPage = () => {
  useWalletRealtime();

  return <NewWalletContainer />;
};

export default NewAccountPage;
