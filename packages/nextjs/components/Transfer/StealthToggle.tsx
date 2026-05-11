"use client";

import { isStealthSupportedChain, isStealthSupportedToken } from "@polypay/shared";
import { STEALTH_ENABLED } from "~~/constants";
import { useStealthStatus } from "~~/hooks/api/useStealthStatus";

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

  // Hide the entire toggle when the global feature flag is off so users never
  // see the option in environments where stealth isn't wired up. We call hooks
  // unconditionally above to satisfy React's rules-of-hooks.
  if (!STEALTH_ENABLED) return null;

  let hint: string | null = null;
  if (!chainOk) hint = "Stealth payments are only available on Base mainnet.";
  else if (!tokenOk) hint = "Stealth supports only ETH and USDC.";
  else if (!recipientAddress) hint = null;
  else if (status.isLoading) hint = "Checking recipient setup…";
  else if (!recipientOk) hint = "Recipient has not registered. Send them polypay.app/receive to set up.";

  const inputDisabled = disabled || !chainOk || !tokenOk || !recipientOk;

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
    </div>
  );
}
