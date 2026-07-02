"use client";

import { TxStatus } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { Form, FormField, FormInput } from "~~/components/form";
import { Button } from "~~/components/ui/button";
import { useArcAuth } from "~~/hooks/app/arc/useArcAuth";
import { useArcTransactions, useArcTransfer } from "~~/hooks/app/arc/useArcTransfer";
import { useZodForm } from "~~/hooks/form";
import { TransferFormData, transferSchema } from "~~/lib/form";
import { ArcTransaction, arcApi } from "~~/services/api";
import { notification } from "~~/utils/scaffold-eth";

// Arc accounts have no single-account GET endpoint yet, so we fetch the
// signer's account list and resolve the given accountId against it.
const useArcAccount = (accountId: string, enabled: boolean) => {
  const { data: accounts } = useQuery({
    queryKey: ["arcAccounts"],
    queryFn: arcApi.getAccounts,
    enabled,
  });

  return accounts?.find(account => account.id === accountId);
};

/**
 * The Arc (ECDSA, non-private) account view: propose / approve / execute a USDC
 * transfer. Reused by the dashboard, the transfer page, and the /arc/[id] route
 * so Arc accounts share the same surfaces as ZK accounts.
 */
export default function ArcAccountPanel({
  accountId,
  transactionsOnly,
}: {
  accountId: string;
  // Dashboard usage: render only the transaction list (no header/form), since the
  // dashboard already has its own header and the transfer form lives on the transfer page.
  transactionsOnly?: boolean;
}) {
  const { address, isAuthenticated, login, isLoading: isLoggingIn } = useArcAuth();

  const account = useArcAccount(accountId, isAuthenticated);
  const { data: transactions, isLoading: isLoadingTxs } = useArcTransactions(accountId);
  const { propose, approve, execute, isProposing, isApproving, isExecuting } = useArcTransfer();

  const form = useZodForm({
    schema: transferSchema,
    defaultValues: { recipient: "", amount: "" },
  });

  const onSubmit = async (data: TransferFormData) => {
    if (!account) return;
    try {
      await propose(account, data.recipient, data.amount);
      form.reset({ recipient: "", amount: "" });
    } catch {
      // Errors are already surfaced via notification in useArcTransfer.
    }
  };

  const handleApprove = async (tx: ArcTransaction) => {
    if (!account) return;
    try {
      await approve(account, tx);
    } catch {
      // Errors are already surfaced via notification in useArcTransfer.
    }
  };

  const handleExecute = async (tx: ArcTransaction) => {
    try {
      await execute(tx);
    } catch {
      // Errors are already surfaced via notification in useArcTransfer.
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-white rounded-lg border border-divider">
        <p className="text-text-secondary text-base">Sign in with your wallet to continue.</p>
        <Button
          onClick={async () => {
            const ok = await login();
            if (!ok) {
              notification.error("Arc sign-in failed. Please try again.");
            }
          }}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Signing in..." : "Sign in with wallet"}
        </Button>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-white rounded-lg border border-divider">
        <p className="text-text-secondary text-base">Loading Arc account...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-white rounded-lg border border-divider p-6 gap-6">
      {!transactionsOnly && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-text-primary uppercase">Arc transfer</h1>
            <p className="text-sm text-text-secondary mt-1">
              {account.address} - threshold {account.threshold} / {account.signers.length}
            </p>
            <span className="inline-flex mt-2 items-center px-2 py-0.5 text-xs font-semibold text-orange-500 bg-orange-50 rounded-md">
              Non-private - signer addresses are public
            </span>
          </div>

          <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField<TransferFormData> name="recipient">
              {({ field }) => <FormInput {...field} placeholder="Recipient address" name="recipient" />}
            </FormField>
            <FormField<TransferFormData> name="amount">
              {({ field }) => <FormInput {...field} placeholder="Amount (USDC)" name="amount" />}
            </FormField>
            <Button type="submit" disabled={isProposing} className="w-fit">
              {isProposing ? "Proposing..." : "Propose transfer"}
            </Button>
          </Form>
        </>
      )}

      <div className="flex flex-col gap-3">
        <div className="text-text-secondary text-base font-medium">Transactions</div>

        {isLoadingTxs && <p className="text-text-secondary text-sm">Loading transactions...</p>}
        {!isLoadingTxs && transactions?.length === 0 && (
          <p className="text-text-secondary text-sm">No transactions yet.</p>
        )}

        {transactions?.map(tx => {
          const isPending = tx.status === TxStatus.PENDING;
          const hasVoted = !!address && tx.voters.some(voter => voter.toLowerCase() === address.toLowerCase());
          const thresholdMet = tx.approveCount >= tx.threshold;

          return (
            <div key={tx.id} className="flex flex-col gap-2 rounded-[16px] border border-divider p-4">
              <div className="text-sm text-text-primary">
                Nonce {tx.nonce} - To {tx.to} - {formatUnits(BigInt(tx.value), 18)} USDC
              </div>
              <div className="text-sm text-text-secondary">
                Status: {tx.status} - Signatures: {tx.approveCount} / {tx.threshold}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isPending || hasVoted || isApproving}
                  onClick={() => handleApprove(tx)}
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  disabled={!isPending || !thresholdMet || isExecuting}
                  onClick={() => handleExecute(tx)}
                >
                  {isExecuting ? "Executing..." : "Execute"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
