"use client";

import { type FC } from "react";
import { TransactionItem } from "./_components";
import { useTransactions } from "~~/hooks/api/useTransaction";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Pool: FC = () => {
  const { data: transactions, isFetching } = useTransactions();

  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
    watch: true,
  });

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

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
            {isFetching
              ? "Loading..."
              : transactions?.length === 0
                ? "No pending transactions"
                : transactions?.map(tx => (
                    <TransactionItem key={tx.txId.toString()} tx={tx} signaturesRequired={signaturesRequired || 0n} />
                  ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pool;
