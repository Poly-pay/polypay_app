"use client";

import React from "react";
import NewAccountContainer from "~~/components/NewAccount/NewAccountContainer";
import { useAccountRealtime } from "~~/hooks";

const NewAccountPage = () => {
  useAccountRealtime();

  return <NewAccountContainer />;
};

export default NewAccountPage;
