"use client";

import React, { useState } from "react";
import { PoolStats } from "./PoolStats";
import { getContractConfigByChainId, getTokenBySymbol } from "@polypay/shared";
import { useAccount } from "wagmi";
import { MIXER_DENOMINATIONS, MIXER_SUPPORTED_CHAIN_IDS } from "~~/configs/mixer.config";
import { useMyAccounts } from "~~/hooks";
import type { MixerDepositSlot } from "~~/hooks/app/useMixerKeys";
import { useMixerWithdraw } from "~~/hooks/app/useMixerWithdraw";
import { notification } from "~~/utils/scaffold-eth";

const TOKEN_KEYS = ["ETH", "ZEN", "USDC"] as const;

export function WithdrawTab() {
  const { chain } = useAccount();
  const chainId = chain?.id ?? MIXER_SUPPORTED_CHAIN_IDS[0];
  const [tokenKey, setTokenKey] = useState<"ETH" | "ZEN" | "USDC">("ETH");
  const [denomination, setDenomination] = useState<string>(MIXER_DENOMINATIONS.ETH[0]);
  const [slots, setSlots] = useState<MixerDepositSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MixerDepositSlot | null>(null);
  const [recipient, setRecipient] = useState("");

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

  const { data: accounts = [] } = useMyAccounts();
  const { withdraw, getWithdrawableSlots, loadingState, setError, isReady } = useMixerWithdraw();

  const loadSlots = async () => {
    setError(null);
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const list = await getWithdrawableSlots(chainId, tokenAddress, denomination);
      setSlots(list);
      if (list.length > 0 && !recipient && accounts.length > 0) {
        setRecipient(accounts[0].address ?? "");
      }
    } catch (e: any) {
      notification.error(e?.message ?? "Failed to load deposits");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedSlot || !recipient) {
      notification.error("Select a deposit and enter recipient");
      return;
    }
    setError(null);
    try {
      const result = await withdraw({
        chainId,
        token: tokenAddress,
        denomination,
        recipient,
        slot: selectedSlot,
      });
      notification.success(`Withdraw successful. Tx: ${result.txHash}`);
      setSelectedSlot(null);
      setSlots(prev => prev.filter(s => s.leafIndex !== selectedSlot.leafIndex));
    } catch (e: any) {
      notification.error(e?.message ?? "Withdraw failed");
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
        Withdraw to your multisig (or any address). Relayer submits the transaction so the link is broken.
      </p>
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
            setSlots([]);
            setSelectedSlot(null);
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
              onClick={() => {
                setDenomination(d);
                setSlots([]);
                setSelectedSlot(null);
              }}
            >
              {formatDenom(d, resolvedToken?.decimals ?? 18)} {tokenKey}
            </button>
          ))}
        </div>
        <PoolStats chainId={chainId} token={tokenAddress} denomination={denomination} />
      </div>

      <button
        type="button"
        className="px-4 py-2 border border-grey-300 rounded-lg font-medium hover:bg-grey-50 disabled:opacity-50"
        disabled={!isReady || !mixerDeployed || loadingSlots}
        onClick={loadSlots}
      >
        {loadingSlots ? "Loading..." : "Load my deposits"}
      </button>

      {slots.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">Your withdrawable deposit</label>
            <select
              className="w-full border border-grey-300 rounded-lg px-3 py-2 text-sm"
              value={selectedSlot?.leafIndex ?? ""}
              onChange={e => {
                const idx = Number(e.target.value);
                setSelectedSlot(slots.find(s => s.leafIndex === idx) ?? null);
              }}
            >
              <option value="">Select one</option>
              {slots.map(s => (
                <option key={s.leafIndex} value={s.leafIndex}>
                  Leaf #{s.leafIndex} (index {s.n})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">Recipient (e.g. multisig)</label>
            <select
              className="w-full border border-grey-300 rounded-lg px-3 py-2 text-sm"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            >
              <option value="">Select or type below</option>
              {accounts.map(a => (
                <option key={a.id} value={a.address}>
                  {a.name ?? a.address?.slice(0, 10)}...
                </option>
              ))}
            </select>
            <input
              type="text"
              className="mt-1 w-full border border-grey-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Or paste address"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="px-4 py-2 bg-main-magenta text-white rounded-lg font-medium disabled:opacity-50"
            disabled={!selectedSlot || !recipient || !!loadingState}
            onClick={handleWithdraw}
          >
            {loadingState || "Withdraw"}
          </button>
        </>
      )}

      {slots.length === 0 && !loadingSlots && (
        <p className="text-grey-500 text-sm">
          No withdrawable deposits for this pool, or click &quot;Load my deposits&quot; to scan.
        </p>
      )}
    </div>
  );
}
