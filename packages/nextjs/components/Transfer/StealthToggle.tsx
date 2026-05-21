"use client";

import { isStealthSupportedChain, isStealthSupportedToken } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useStealthStatus } from "~~/hooks/api/useStealthStatus";
import { getUmbraToll } from "~~/utils/stealth";

const STEALTH_RPC_URL = "https://base-rpc.publicnode.com";

function useUmbraToll(chainId: number | undefined) {
  return useQuery({
    queryKey: ["umbra", "toll", chainId],
    queryFn: () => getUmbraToll(chainId!, STEALTH_RPC_URL),
    enabled: !!chainId && isStealthSupportedChain(chainId),
    staleTime: 5 * 60_000,
  });
}

interface StealthToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  chainId: number | undefined;
  tokenAddress: string | undefined;
  recipientAddress: string | undefined;
  disabled?: boolean;
}

// Shared UI for the "Send privately" toggle. Same component drives the
// single-transfer and batch-edit flows so disable/hint logic stays in one place.
export function StealthToggle({
  checked,
  onChange,
  chainId,
  tokenAddress,
  recipientAddress,
  disabled = false,
}: StealthToggleProps) {
  const chainOk = !!chainId && isStealthSupportedChain(chainId);
  const tokenOk = chainOk && !!tokenAddress && isStealthSupportedToken(chainId!, tokenAddress);

  const status = useStealthStatus(chainOk && tokenOk && recipientAddress ? recipientAddress : undefined);
  const recipientOk = status.data?.registered === true;
  const tollQuery = useUmbraToll(chainOk ? chainId : undefined);
  const tollText = tollQuery.data && tollQuery.data > 0n ? `${formatEther(tollQuery.data)} ETH` : null;

  // Hide entirely when the feature flag is off OR the current chain/token
  // can't use Umbra. There's no value in showing a dangling option for ZEN
  // or non-Base chains — users would just see noise. Hooks above are
  // called unconditionally to satisfy React's rules-of-hooks.
  if (!chainOk || !tokenOk) return null;

  let hint: string | null = null;
  if (!recipientAddress) hint = null;
  else if (status.isLoading) hint = "Checking recipient setup…";
  else if (!recipientOk) hint = "Recipient has not registered. Ask them to set up at app.umbra.cash.";

  const inputDisabled = disabled || !recipientOk;

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked && !inputDisabled}
          onChange={e => onChange(e.target.checked)}
          disabled={inputDisabled}
          className="h-4 w-4 accent-main-violet disabled:opacity-50"
        />
        <span className={`text-sm font-medium ${inputDisabled ? "text-grey-400" : "text-grey-800"}`}>
          Send privately (stealth)
        </span>
      </label>
      {hint && <span className="text-xs text-grey-500 pl-6">{hint}</span>}
      {tollText && !hint && (
        <span className="text-xs text-grey-500 pl-6">
          Umbra protocol toll: {tollText} per recipient, paid from your multisig.
        </span>
      )}
    </div>
  );
}
