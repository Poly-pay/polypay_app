"use client";

import { useCallback, useState } from "react";
import { getContractConfigByChainId, MIXER_ABI } from "@polypay/shared";
import { useWriteContract } from "wagmi";
import { mixerApi } from "~~/services/api/mixerApi";
import { useMixerKeys } from "./useMixerKeys";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

function bigintToBytes32Hex(v: bigint): `0x${string}` {
  const hex = v.toString(16).padStart(64, "0");
  return `0x${hex}` as `0x${string}`;
}

export function useMixerDeposit() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { getNextDepositIndex, ensureBaseSecret, isReady: keysReady } = useMixerKeys();
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (params: {
      chainId: number;
      token: string;
      denomination: string;
      value?: bigint;
    }) => {
      setError(null);
      const { chainId, token, denomination, value } = params;
      const config = getContractConfigByChainId(chainId);
      const mixerAddress = config.mixerAddress;
      if (!mixerAddress || mixerAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Mixer is not deployed on this network");
      }
      await ensureBaseSecret();
      const { commitments } = await mixerApi.getDeposits({ chainId, token, denomination });
      const { commitment } = await getNextDepositIndex(commitments);
      const commitmentHex = bigintToBytes32Hex(commitment);
      const tokenAddress = token as `0x${string}`;
      const denomBigInt = BigInt(denomination);

      if (token !== ZERO_ADDRESS) {
        await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [mixerAddress, denomBigInt],
        });
      }

      if (value !== undefined && value > 0n) {
        await writeContractAsync({
          address: mixerAddress,
          abi: MIXER_ABI,
          functionName: "deposit",
          args: [tokenAddress, denomBigInt, commitmentHex],
          value,
        });
      } else {
        await writeContractAsync({
          address: mixerAddress,
          abi: MIXER_ABI,
          functionName: "deposit",
          args: [tokenAddress, denomBigInt, commitmentHex],
        });
      }
    },
    [ensureBaseSecret, getNextDepositIndex, writeContractAsync],
  );

  return {
    deposit,
    isPending: isWritePending,
    error,
    setError,
    isReady: keysReady,
  };
}
