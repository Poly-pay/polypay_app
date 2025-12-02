"use client";

import { type FC, useEffect, useState } from "react";
import { TransactionItem } from "./_components";
import { useScaffoldContract, useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export interface PendingTransaction {
  txId: bigint;
  to: string;
  value: bigint;
  data: `0x${string}`;
  requiredApprovalsWhenExecuted: bigint;
  validSignatures: bigint;
  executed: boolean;
}
const Pool: FC = () => {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
    watch: true,
  });

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: executedEvents } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "TransactionExecuted",
    watch: true,
  });

  const { data: signatureEvents } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "SignatureSubmitted",
    watch: true,
  });

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
  });

  // Fetch pending transactions from contract
  useEffect(() => {
    const fetchPendingTransactions = async () => {
      if (!metaMultiSigWallet || nonce === undefined) return;

      try {
        setLoading(true);
        const pendingTxs: PendingTransaction[] = [];

        // Loop from 0 to nonce
        for (let txId = 0n; txId < nonce; txId++) {
          const [to, value, data, validSignatures, requiredApprovalsWhenExecuted, executed] =
            await metaMultiSigWallet.read.getPendingTx([txId]);

          pendingTxs.push({
            txId,
            to,
            value,
            data: data as `0x${string}`,
            requiredApprovalsWhenExecuted,
            validSignatures,
            executed,
          });
        }

        // Sort by txId descending (newest first)
        pendingTxs.sort((a, b) => (a.txId > b.txId ? -1 : 1));
        setTransactions(pendingTxs);
      } catch (e) {
        notification.error("Error fetching pending transactions");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingTransactions();
  }, [nonce, executedEvents, signatureEvents]);

  return (
    <div className="flex flex-col flex-1 items-center my-20 gap-8">
      <div className="flex items-center flex-col flex-grow w-full max-w-2xl">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full">
          <div className="text-xl font-bold">Pending Transactions</div>

          <div className="flex gap-4 mt-2">
            <span>Nonce: #{nonce?.toString() || "..."}</span>
            <span>Required: {signaturesRequired?.toString() || "..."}</span>
          </div>

          <div className="flex flex-col mt-8 gap-4 w-full">
            {loading
              ? "Loading..."
              : transactions.length === 0
                ? "No pending transactions"
                : transactions.map(tx => (
                    <TransactionItem key={tx.txId.toString()} tx={tx} signaturesRequired={signaturesRequired || 0n} />
                  ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pool;
