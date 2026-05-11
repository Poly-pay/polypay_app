"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { isStealthSupportedChain } from "@polypay/shared";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { STEALTH_ENABLED } from "~~/constants";
import { useStealthStatus } from "~~/hooks/api/useStealthStatus";
import { useStealthRegistration } from "~~/hooks/app/useStealthRegistration";
import { formatErrorMessage } from "~~/utils/formatError";
import { notification } from "~~/utils/scaffold-eth";

const BASE_MAINNET = 8453;
const DEFAULT_RPC_URL = "https://mainnet.base.org";

export default function ReceivePage() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const stealthStatus = useStealthStatus(address ?? null);
  const { register, step, isLoading } = useStealthRegistration();
  const [copied, setCopied] = useState(false);

  // When the feature flag is off, treat the route as if it didn't exist. We
  // call all hooks above unconditionally to satisfy rules-of-hooks.
  if (!STEALTH_ENABLED) {
    notFound();
  }

  const wrongChain = isConnected && !isStealthSupportedChain(chainId);
  const alreadyRegistered = stealthStatus.data?.registered === true;

  const handleRegister = async () => {
    if (!connector) {
      notification.error("Wallet not ready");
      return;
    }
    try {
      const provider = await connector.getProvider();
      await register({
        chainId: BASE_MAINNET,
        rpcUrl: DEFAULT_RPC_URL,
        injectedProvider: provider,
      });
      notification.success("Stealth keys registered on Base");
    } catch (err) {
      notification.error(formatErrorMessage(err, "Registration failed"));
    }
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-8 flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-grey-950">Receive private payments</h1>
          <p className="text-grey-700 text-sm mt-2">
            Set up a one-time receiving identity. Senders using PolyPay can pay you privately via the Umbra stealth
            address protocol on Base.
          </p>
        </header>

        {!isConnected && (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-sm text-grey-700">Connect the wallet you want to receive into.</p>
            <ConnectButton />
          </div>
        )}

        {isConnected && wrongChain && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-4 text-sm text-yellow-900">
            Switch to <strong>Base mainnet</strong> to register. Stealth payments are not available on other networks.
          </div>
        )}

        {isConnected && !wrongChain && stealthStatus.isLoading && (
          <div className="text-sm text-grey-600 text-center">Checking registration status…</div>
        )}

        {isConnected && !wrongChain && alreadyRegistered && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-green-50 border border-green-300 p-4 text-sm text-green-900">
              You are already set up to receive private payments.
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-grey-600">Share this wallet address with senders:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-grey-100 px-3 py-2 rounded-md text-sm break-all">{address}</code>
                <button
                  onClick={handleCopyAddress}
                  className="px-3 py-2 rounded-md bg-main-violet text-white text-sm font-medium"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-grey-50 border border-grey-200 p-4 text-sm text-grey-800">
              <strong className="block mb-1">To check and withdraw incoming payments:</strong>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://app.umbra.cash"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-main-violet underline"
                  >
                    app.umbra.cash
                  </a>
                </li>
                <li>Connect this same wallet and sign to scan your inbox</li>
                <li>Withdraw — Umbra&apos;s relayer pays gas and deducts a small fee from the token</li>
              </ol>
            </div>
          </div>
        )}

        {isConnected && !wrongChain && stealthStatus.isFetched && !alreadyRegistered && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-grey-50 border border-grey-200 p-4 text-sm text-grey-800">
              <p className="font-medium mb-2">You will be asked to sign two messages:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>A canonical Umbra message to derive your stealth keys.</li>
                <li>
                  An EIP-712 authorization so PolyPay can submit the registration on chain (no gas required from you).
                </li>
              </ol>
              <p className="mt-3 text-xs text-grey-600">
                Tip: the same wallet seed will always derive the same keys. Back up your seed phrase — losing it means
                losing access to past stealth payments.
              </p>
            </div>
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full py-3 rounded-md bg-main-violet text-white font-medium disabled:opacity-60"
            >
              {step === "deriving" && "Deriving keys…"}
              {step === "signing" && "Signing authorization…"}
              {step === "submitting" && "Submitting on chain…"}
              {step === "idle" && "Set up to receive"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
