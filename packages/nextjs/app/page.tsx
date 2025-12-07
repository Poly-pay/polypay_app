"use client";

import type { NextPage } from "next";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const Home: NextPage = () => {
  useEffect(() => {
    redirect('/dashboard');
  }, [])

  return (
    <>
    </>
  );
};

export default Home;
