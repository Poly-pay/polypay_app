"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";
import type { NextPage } from "next";

const Home: NextPage = () => {
  useEffect(() => {
    redirect("/dashboard");
  }, []);

  return <></>;
};

export default Home;
