"use client";

import React from "react";
import { isX402SupportedChain } from "@polypay/shared";
import { parseUnits } from "viem";
import { useChainId, useSwitchChain } from "wagmi";
import { z } from "zod";
import ModalContainer from "~~/components/modals/ModalContainer";
import { useX402Deposit } from "~~/hooks/api/useX402Deposit";
import { useZodForm } from "~~/hooks/form";
import type { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth/notification";

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
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { mutate, isPending, isSuccess, data, error, reset } = useX402Deposit();
  const form = useZodForm({ schema, defaultValues: { amount: "" } });

  const wrongChain = typeof multisigChainId === "number" && chainId !== multisigChainId;
  const unsupported = !isX402SupportedChain(chainId);

  const handleSubmit = form.handleSubmit((values: FormValues) => {
    if (!multisigAddress) {
      notification.error("Missing multisig address");
      return;
    }
    mutate({
      multisigAddress,
      amount: parseUnits(values.amount, 6),
    });
  });

  const handleClose = () => {
    reset();
    form.reset();
    onClose();
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      title="Deposit USDC"
      isCloseButton
      className="bg-white rounded-3xl w-[min(480px,92vw)] px-5 py-5 shadow-modal"
    >
      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-3">
          <p className="text-sm text-base-content/70 pr-10">
            Deposit USDC to this multisig without paying gas. You will sign one message off-chain.
          </p>

          {wrongChain && (
            <div className="flex flex-col gap-2 rounded border border-warning/50 bg-warning/10 p-3">
              <span className="text-sm text-warning">Your wallet is on a different network than this multisig.</span>
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={() => multisigChainId && switchChain({ chainId: multisigChainId })}
              >
                Switch network
              </button>
            </div>
          )}

          {unsupported && <p className="text-error text-sm">Connect to Base or Base Sepolia to continue.</p>}

          <label className="text-sm font-medium">Amount (USDC)</label>
          <input
            {...form.register("amount")}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1"
            disabled={isPending || wrongChain || unsupported}
            className="w-full h-11 px-4 rounded-full border border-grey-300 bg-white text-base outline-none focus:border-grey-500 disabled:opacity-50"
          />
          {form.formState.errors.amount && (
            <span className="text-error text-xs">{form.formState.errors.amount.message}</span>
          )}
          {error && <p className="text-error text-sm">{(error as Error).message}</p>}

          <button type="submit" disabled={isPending || wrongChain || unsupported} className="btn btn-primary w-full">
            {isPending ? "Signing / submitting…" : "Deposit"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 pt-3">
          <p className="text-success font-medium">Deposit submitted</p>
          <p className="text-sm">Status: {data?.status}</p>
          {data?.principalTxHash && (
            <a
              href={txExplorerUrl(data.chainId, data.principalTxHash)}
              target="_blank"
              rel="noreferrer"
              className="text-xs link link-primary break-all"
            >
              Tx: {data.principalTxHash}
            </a>
          )}
          <button type="button" className="btn btn-ghost w-full" onClick={handleClose}>
            Close
          </button>
        </div>
      )}
    </ModalContainer>
  );
};

export default DepositModal;
