"use client";

import React from "react";
import { Account } from "@polypay/shared";
import { Send, Users } from "lucide-react";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~~/components/ui/dialog";
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
      className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50 transition-all ${
        isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100 hover:border-gray-300"
      }`}
    >
      <span className="font-mono text-sm text-[#1B1B1B] break-all pr-3">{account.commitment}</span>

      <Send className="w-4 h-4 text-[#FF7CEB] flex-shrink-0" />
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
        <Button size="sm" className="w-full bg-[#FF7CEB] hover:bg-[#f35ddd] text-white cursor-pointer">
          <Send className="w-4 h-4 mr-2" />
          Send my commitment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200 shadow-xl rounded-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1B1B1B]">
            <Users className="w-5 h-5" />
            Select recipient
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500">Loading accounts...</span>
            </div>
          ) : otherAccounts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {otherAccounts.map(account => (
                <AccountItem key={account.id} account={account} onSelect={handleSelect} isLoading={isSending} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32">
              <Users className="w-10 h-10 mb-3 text-gray-400" />
              <span className="text-gray-600 font-medium">No other accounts found</span>
              <span className="text-gray-400 text-sm mt-1">Invite others to join PolyPay</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
