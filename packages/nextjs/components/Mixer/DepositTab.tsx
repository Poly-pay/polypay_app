"use client";

import React, { useState } from "react";
import { PoolStats } from "./PoolStats";
import { getContractConfigByChainId, getTokenBySymbol } from "@polypay/shared";
import { useAccount } from "wagmi";
import { MIXER_DENOMINATIONS, MIXER_SUPPORTED_CHAIN_IDS } from "~~/configs/mixer.config";
import { useMixerDeposit } from "~~/hooks/app/useMixerDeposit";
import { notification } from "~~/utils/scaffold-eth";

const TOKEN_KEYS = ["ETH", "ZEN", "USDC"] as const;

export function DepositTab() {
  const { chain } = useAccount();
  const chainId = chain?.id ?? MIXER_SUPPORTED_CHAIN_IDS[0];
  const [tokenKey, setTokenKey] = useState<"ETH" | "ZEN" | "USDC">("ETH");
  const [denomination, setDenomination] = useState<string>(MIXER_DENOMINATIONS.ETH[0]);

  const config = getContractConfigByChainId(chainId);
  const mixerDeployed = config.mixerAddress && config.mixerAddress !== "0x0000000000000000000000000000000000000000";

  const resolvedToken = getTokenBySymbol(tokenKey, chainId);
  const tokenAddress = resolvedToken?.address ?? "0x0000000000000000000000000000000000000000";
  const denominations =
    tokenKey === "ETH"
      ? MIXER_DENOMINATIONS.ETH
      : tokenKey === "ZEN"
        ? MIXER_DENOMINATIONS.ZEN
        : MIXER_DENOMINATIONS.USDC;

  const { deposit, isPending, setError, isReady } = useMixerDeposit();

  const handleDeposit = async () => {
    if (!mixerDeployed) {
      notification.error("Mixer is not deployed on this network");
      return;
    }
    setError(null);
    try {
      const value = tokenKey === "ETH" ? BigInt(denomination) : undefined;
      await deposit({
        chainId,
        token: tokenAddress,
        denomination,
        value,
      });
      // TODO: Include deposit transaction hash in this notification once available from the hook.
      notification.success("Deposit submitted. Confirm in your wallet.");
    } catch (e: any) {
      notification.error(e?.message ?? "Deposit failed");
    }
  };

  const formatDenom = (d: string, decimals: number) => {
    const n = Number(d) / 10 ** decimals;
    if (n >= 1) return n.toFixed(0);
    return n.toFixed(decimals === 18 ? 4 : 2);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-grey-600 text-sm">
        Deposit from your personal wallet. Your deposit is unlinkable to your withdrawal.
      </p>
      {!MIXER_SUPPORTED_CHAIN_IDS.includes(chainId as any) && (
        <p className="text-amber-600 text-sm">Switch to Horizen testnet or Base Sepolia to use the mixer.</p>
      )}
      {!mixerDeployed && MIXER_SUPPORTED_CHAIN_IDS.includes(chainId as any) && (
        <p className="text-amber-600 text-sm">Mixer contract is not deployed on this network yet.</p>
      )}

      <div>
        <label className="block text-sm font-medium text-grey-700 mb-1">Token</label>
        <select
          className="w-full border border-grey-300 rounded-lg px-3 py-2 text-sm"
          value={tokenKey}
          onChange={e => {
            setTokenKey(e.target.value as "ETH" | "ZEN" | "USDC");
            const denoms =
              e.target.value === "ETH"
                ? MIXER_DENOMINATIONS.ETH
                : e.target.value === "ZEN"
                  ? MIXER_DENOMINATIONS.ZEN
                  : MIXER_DENOMINATIONS.USDC;
            setDenomination(denoms[0]);
          }}
        >
          {TOKEN_KEYS.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-grey-700 mb-1">Denomination</label>
        <div className="flex flex-wrap gap-2">
          {denominations.map(d => (
            <button
              key={d}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                denomination === d
                  ? "bg-main-magenta/10 border-main-magenta text-main-magenta"
                  : "border-grey-300 text-grey-700 hover:bg-grey-50"
              }`}
              onClick={() => setDenomination(d)}
            >
              {formatDenom(d, resolvedToken?.decimals ?? 18)} {tokenKey}
            </button>
          ))}
        </div>
        <PoolStats chainId={chainId} token={tokenAddress} denomination={denomination} label="Pool size" />
      </div>

      <button
        type="button"
        className="px-4 py-2 bg-main-magenta text-white rounded-lg font-medium disabled:opacity-50"
        disabled={!isReady || isPending || !mixerDeployed}
        onClick={handleDeposit}
      >
        {isPending ? "Confirm in wallet..." : "Deposit"}
      </button>
    </div>
  );
}
