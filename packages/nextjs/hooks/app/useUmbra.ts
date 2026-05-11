"use client";

import { useMemo } from "react";
import { getUmbraAddresses, isStealthSupportedChain } from "@polypay/shared";
import { Umbra } from "@umbracash/umbra-js";
import { providers } from "ethers";

// We use ethers v5 here because @umbracash/umbra-js is built on ethers v5.
// The rest of PolyPay uses viem/wagmi — keep this isolated.
export function useUmbra(chainId: number | undefined, rpcUrl: string | undefined) {
  return useMemo(() => {
    if (!chainId || !rpcUrl) return null;
    if (!isStealthSupportedChain(chainId)) return null;

    const provider = new providers.JsonRpcProvider(rpcUrl, chainId);
    // Throws if chain unsupported; we guard above so this is informational.
    getUmbraAddresses(chainId);
    return new Umbra(provider, chainId);
  }, [chainId, rpcUrl]);
}
