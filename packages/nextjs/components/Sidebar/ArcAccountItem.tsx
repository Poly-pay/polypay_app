import React from "react";
import { useRouter } from "next/navigation";
import { Account } from "@polypay/shared";
import { Wallet } from "lucide-react";
import { ArcAccount } from "~~/services/api";
import { useAccountStore } from "~~/services/store";
import { formatAddress } from "~~/utils/format";

interface ArcAccountItemProps {
  account: ArcAccount;
}

// Adapt an Arc account to the shared Account shape used by the dashboard/transfer.
export const arcAccountToAccount = (account: ArcAccount): Account => ({
  id: account.id,
  address: account.address,
  name: account.name ?? "Arc Multisig",
  threshold: account.threshold,
  chainId: account.chainId,
  contractVersion: 0,
  createdAt: "",
  updatedAt: "",
  chainType: "ecdsa",
  signers: account.signers.map(address => ({ commitment: address, isCreator: false })),
});

// Arc accounts are ECDSA multisigs (chainType === "ecdsa"): signer addresses are
// public on-chain. Selecting one sets it as the current account and lands on the
// dashboard, which branches its data/actions by chainType.
export default function ArcAccountItem({ account }: ArcAccountItemProps) {
  const { setCurrentAccount } = useAccountStore();
  const router = useRouter();

  const handleSelect = () => {
    setCurrentAccount(arcAccountToAccount(account));
    router.push("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className="flex items-center justify-between h-[58px] px-2 rounded-lg bg-grey-50 hover:bg-grey-100 transition-colors w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-main-white rounded-full flex items-center justify-center flex-shrink-0">
          <Wallet className="w-4 h-4 text-grey-700" />
        </div>

        <div className="flex flex-col justify-center gap-1 text-left">
          <span className="text-[15px] font-medium text-grey-950 tracking-[-0.03em]">
            {formatAddress(account.address, { start: 4, end: 4 })}
          </span>
          <span className="text-xs font-normal text-grey-500 tracking-[-0.03em]">
            {account.threshold}-of-{account.signers.length} multisig
          </span>
        </div>
      </div>

      <span className="flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-orange-500 bg-orange-50 rounded-md tracking-tight whitespace-nowrap">
        Non-private
      </span>
    </button>
  );
}
