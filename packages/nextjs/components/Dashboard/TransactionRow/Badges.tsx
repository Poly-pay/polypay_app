import React from "react";
import { TxStatus } from "@polypay/shared";
import { ExternalLink } from "lucide-react";
import { VoteStatus, useNetworkTokens } from "~~/hooks";
import scaffoldConfig from "~~/scaffold.config";
import { getBlockExplorerTxHashLink, getBlockExplorerTxLink } from "~~/utils/scaffold-eth/networks";

export function VoteBadge({ status }: { status: VoteStatus | "waiting" }) {
  if (status === "approved") {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-lime-50 rounded-md tracking-tight">
        Approved
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-red-25 rounded-md tracking-tight">
        Denied
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-blue-50 rounded-md tracking-tight">
      Waiting for confirm...
    </span>
  );
}

export function AwaitingBadge() {
  return (
    <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-main-black bg-blue-50 rounded-md tracking-tight">
      Awaiting
    </span>
  );
}

export function StatusBadge({ status, txHash }: { status: TxStatus; txHash?: string }) {
  const { chainId } = useNetworkTokens();

  if (status === TxStatus.EXECUTED) {
    let explorerUrl = "#";

    if (txHash && chainId) {
      const targetNetwork = scaffoldConfig.targetNetworks.find(network => network.id === chainId);

      if (targetNetwork) {
        explorerUrl = getBlockExplorerTxHashLink(targetNetwork, txHash);
      } else {
        explorerUrl = getBlockExplorerTxLink(chainId, txHash) || "#";
      }
    }

    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-grey-900 bg-lime-50 rounded-md tracking-tight hover:opacity-80 transition-opacity"
      >
        Succeed
        <ExternalLink size={14} />
      </a>
    );
  }
  if (status === TxStatus.FAILED) {
    return (
      <span className="flex items-center justify-center px-3 py-1 text-sm font-semibold text-grey-900 bg-red-25 rounded-md tracking-tight">
        Denied
      </span>
    );
  }
  return null;
}

export function ActionButtons({
  onApprove,
  onDeny,
  onExecute,
  loading,
  isExecutable,
  isExecuting,
}: {
  onApprove: () => void;
  onDeny: () => void;
  onExecute: () => void;
  loading: boolean;
  isExecutable: boolean;
  isExecuting: boolean;
}) {
  if (isExecutable || isExecuting) {
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          onExecute();
        }}
        disabled={loading || isExecuting}
        className="w-[90px] py-1 px-3 text-sm font-medium text-white bg-main-black rounded-lg cursor-pointer disabled:opacity-50"
      >
        {loading || isExecuting ? "Executing..." : "Execute"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={e => {
          e.stopPropagation();
          onDeny();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-main-black bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        Deny
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onApprove();
        }}
        disabled={loading}
        className="px-6 py-2 text-sm font-medium text-main-black bg-pink-350 rounded-full hover:bg-pink-450 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}
