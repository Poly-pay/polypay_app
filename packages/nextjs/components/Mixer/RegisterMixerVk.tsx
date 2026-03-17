"use client";

import React from "react";
import { useRegisterMixerVk } from "~~/hooks/app/useRegisterMixerVk";
import { notification } from "~~/utils/scaffold-eth";

// TODO: remove this component
/**
 * Dev-only: Register mixer VK on Kurier before deploying Mixer contract.
 * Copy the returned vkHash into contracts-config.ts mixerVkHash, then deploy.
 */
export function RegisterMixerVk() {
  const { register, loadingState, vkHash, error, setError } = useRegisterMixerVk();

  const handleRegister = async () => {
    setError(null);
    try {
      const hash = await register();
      notification.success(`VK registered. vkHash: ${hash}`);
    } catch (e: any) {
      setError(e?.message ?? "Registration failed");
      notification.error(e?.message ?? "Registration failed");
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-medium text-amber-800 mb-2">Dev: Register Mixer VK (run once before deploy)</p>
      <button
        type="button"
        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        disabled={!!loadingState}
        onClick={handleRegister}
      >
        {loadingState || "Register Mixer VK"}
      </button>
      {vkHash && (
        <div className="mt-3">
          <p className="text-xs text-amber-700 mb-1">vkHash (copy to contracts-config.ts):</p>
          <code className="block text-xs bg-white p-2 rounded border overflow-x-auto break-all">{vkHash}</code>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
