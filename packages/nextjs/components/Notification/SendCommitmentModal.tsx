"use client";

import React from "react";
import { Account } from "@polypay/shared";
import { Send, X, Users } from "lucide-react";
import { Button } from "~~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~~/components/ui/dialog";
import { useAccounts } from "~~/hooks/api/useAccount";
import { useSendCommitment } from "~~/hooks/api/useNotification";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { notification as toast } from "~~/utils/scaffold-eth";

interface AccountItemProps {
  account: Account;
  onSelect: (commitment: string) => void;
  isLoading: boolean;
}

const AccountItem: React.FC<AccountItemProps> = ({ account, onSelect, isLoading }) => {
  return (
    <div
      onClick={() => !isLoading && onSelect(account.commitment)}
      className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 transition-colors ${
        isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
      }`}
    >
      <span className="font-mono text-sm text-[#1B1B1B] break-all">{account.commitment}</span>

      <Send className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
    </div>
  );
};

export const SendCommitmentModal: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const { commitment: myCommitment } = useIdentityStore();
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { mutate: sendCommitment, isPending: isSending } = useSendCommitment();

  // Filter out my own account
  const otherAccounts = React.useMemo(() => {
    if (!accounts || !myCommitment) return [];
    return accounts.filter(account => account.commitment !== myCommitment);
  }, [accounts, myCommitment]);

  const handleSelect = (recipientCommitment: string) => {
    if (!myCommitment) {
      toast.error("No identity found");
      return;
    }

    sendCommitment(
      {
        senderCommitment: myCommitment,
        recipientCommitment,
      },
      {
        onSuccess: () => {
          toast.success("Commitment sent!");
          setOpen(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to send commitment");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="w-full bg-[#FF7CEB] hover:bg-[#f35ddd] text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          Send my commitment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select recipient
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[400px] overflow-y-auto">
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500">Loading accounts...</span>
            </div>
          ) : otherAccounts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {otherAccounts.map(account => (
                <AccountItem
                  key={account.id}
                  account={account}
                  onSelect={handleSelect}
                  isLoading={isSending}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Users className="w-8 h-8 mb-2 text-gray-300" />
              <span>No other accounts found</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
