"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { USDC_TOKEN, formatTokenAmount, isX402SupportedChain } from "@polypay/shared";
import { ArrowLeft, Check, X } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { z } from "zod";
import { Button } from "~~/components/ui/button";
import { useX402Deposit } from "~~/hooks/api/useX402Deposit";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useZodForm } from "~~/hooks/form";
import type { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth/notification";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const schema = z.object({
  amount: z.string().refine(v => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 10_000;
  }, "Amount must be between 1 and 10,000 USDC"),
});

type FormValues = z.infer<typeof schema>;

export interface DepositModalProps extends ModalProps {
  multisigAddress?: `0x${string}`;
  multisigChainId?: number;
}

function txExplorerUrl(chainId: number, txHash: string): string {
  return chainId === 84532 ? `https://sepolia.basescan.org/tx/${txHash}` : `https://basescan.org/tx/${txHash}`;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, multisigAddress, multisigChainId }) => {
  const { openModal } = useModalApp();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address: walletAddress } = useAccount();
  const { mutate, isPending, isSuccess, data, error, reset } = useX402Deposit();
  const form = useZodForm({ schema, defaultValues: { amount: "" } });

  const wrongChain = typeof multisigChainId === "number" && chainId !== multisigChainId;
  const unsupported = !isX402SupportedChain(chainId);

  const usdcAddress = USDC_TOKEN.addresses[chainId] as `0x${string}` | undefined;

  const { data: usdcBalanceRaw } = useReadContract({
    address: usdcAddress,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: {
      enabled: !!walletAddress && !!usdcAddress && !wrongChain && !unsupported,
    },
  });

  const usdcBalance =
    typeof usdcBalanceRaw === "bigint" ? formatTokenAmount(usdcBalanceRaw.toString(), USDC_TOKEN.decimals) : "0";

  const handleSubmit = form.handleSubmit((values: FormValues) => {
    if (!multisigAddress) {
      notification.error("Missing multisig address");
      return;
    }
    mutate({
      multisigAddress,
      amount: parseUnits(values.amount, USDC_TOKEN.decimals),
    });
  });

  const handleClose = () => {
    reset();
    form.reset();
    onClose();
  };

  const handleBack = () => {
    reset();
    form.reset();
    onClose();
    openModal("receiveMethod", { multisigAddress, multisigChainId });
  };

  const handleMax = () => {
    if (!usdcBalanceRaw || typeof usdcBalanceRaw !== "bigint") return;
    const value = formatUnits(usdcBalanceRaw, USDC_TOKEN.decimals);
    form.setValue("amount", value, { shouldValidate: true });
  };

  const handleViewTx = () => {
    if (data?.principalTxHash) {
      window.open(txExplorerUrl(data.chainId, data.principalTxHash), "_blank", "noopener,noreferrer");
    }
  };

  const amount = form.watch("amount");
  const amountError = form.formState.errors.amount?.message;
  const canSubmit =
    !isPending && !wrongChain && !unsupported && !!amount && Number(amount) > 0 && !amountError && !!multisigAddress;

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      isCloseButton={false}
      className="bg-white rounded-3xl w-[min(480px,92vw)] p-0 shadow-modal overflow-hidden"
    >
      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded-lg hover:bg-grey-100 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-grey-1000" />
              </button>
              <span className="text-grey-1000 text-base font-semibold">Deposit USDC</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-50 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-grey-1000" />
            </button>
          </div>

          {/* Description */}
          <p className="px-5 text-sm text-grey-600 leading-5">
            Deposit USDC to this multisig without paying gas. You will sign one message off-chain.
          </p>

          {/* Warnings */}
          {wrongChain && (
            <div className="mx-5 mt-3 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <span className="text-sm text-amber-800">Your wallet is on a different network than this multisig.</span>
              <button
                type="button"
                className="self-start text-sm font-medium text-amber-900 underline cursor-pointer"
                onClick={() => multisigChainId && switchChain({ chainId: multisigChainId })}
              >
                Switch network
              </button>
            </div>
          )}
          {unsupported && !wrongChain && (
            <p className="mx-5 mt-3 text-sm text-red-600">Connect to Base or Base Sepolia to continue.</p>
          )}

          {/* Amount input */}
          <div className="flex flex-col items-center gap-3 px-5 py-8">
            <div className="flex items-center gap-3">
              <Image src="/token/usdc.svg" alt="USDC" width={40} height={40} className="rounded-full" />
              <input
                {...form.register("amount")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                disabled={isPending || wrongChain || unsupported}
                className="text-4xl font-light text-black placeholder:text-grey-300 bg-transparent outline-none w-[80px] text-center disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-grey-600">
                Balance: <span className="font-medium text-grey-1000">{usdcBalance} USDC</span>
              </span>
              <button
                type="button"
                onClick={handleMax}
                disabled={isPending || wrongChain || unsupported}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Max
              </button>
            </div>
            {amountError && <span className="text-red-600 text-xs">{amountError}</span>}
            {error && <p className="text-red-600 text-sm text-center">{(error as Error).message}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-grey-100">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="basis-1/4 h-11 bg-white hover:bg-grey-50 text-grey-1000 border border-grey-200 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 h-11 bg-main-pink hover:bg-pink-550 text-grey-1000 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Signing..." : "Deposit"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-end px-5 pt-5 pb-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-grey-200 hover:bg-grey-50 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-grey-1000" />
            </button>
          </div>

          {/* Success body */}
          <div className="flex flex-col items-center gap-4 px-5 py-6">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-9 h-9 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-grey-1000 text-2xl font-semibold uppercase tracking-tight">Deposit successful</h3>
            <p className="text-sm text-grey-600 text-center">Your funds are now available in your account.</p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-grey-100">
            <Button
              type="button"
              onClick={handleViewTx}
              disabled={!data?.principalTxHash}
              className="flex-1 h-11 bg-grey-1000 hover:bg-grey-950 text-white rounded-xl cursor-pointer disabled:opacity-50"
            >
              View transaction
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 bg-main-pink hover:bg-pink-550 text-grey-1000 rounded-xl cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </ModalContainer>
  );
};

export default DepositModal;
