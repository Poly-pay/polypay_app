import React from "react";
import Image from "next/image";
import { AddressWithContact } from "./AddressWithContact";
import { getExpandedHeaderText } from "./utils";
import { TxType, getTokenByAddress } from "@polypay/shared";
import { TransactionRowData, VoteStatus, useNetworkTokens } from "~~/hooks";
import { formatAddress, formatAmount } from "~~/utils/format";

interface TxHeaderProps {
  tx: TransactionRowData;
  myVoteStatus: VoteStatus | null;
  onApprove: () => void;
  onDeny: () => void;
  loading: boolean;
  initiatorName?: string;
  initiatorCommitment: string;
}

function SignerBadgeList({ signerData }: { signerData: TransactionRowData["signerData"] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {signerData?.map((signer, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-[12px] bg-white text-main-black px-3 py-1.5 rounded-full"
        >
          <Image src="/avatars/signer-3.svg" alt="Signer" width={16} height={16} className="rounded-full" />
          <span>
            {signer.name
              ? `${signer.name} (${formatAddress(signer.commitment, { start: 4, end: 4 })})`
              : formatAddress(signer.commitment, { start: 4, end: 4 })}
          </span>
        </div>
      ))}
    </div>
  );
}

function ThresholdUpdate({ oldThreshold, newThreshold }: { oldThreshold?: number; newThreshold?: number }) {
  if (!newThreshold || newThreshold === oldThreshold) return null;
  return (
    <div className="flex items-center gap-2 mt-3 text-sm">
      <span className="text-white/80">Threshold update:</span>
      <span className="text-sm text-white font-medium">{String(oldThreshold).padStart(2, "0")}</span>
      <Image src="/icons/arrows/arrow-right-long-pink.svg" alt="Arrow Right" width={100} height={100} />
      <span className="text-sm text-white font-medium">{String(newThreshold).padStart(2, "0")}</span>
    </div>
  );
}

export function TxHeader({
  tx,
  myVoteStatus,
  onApprove,
  onDeny,
  loading,
  initiatorCommitment,
  initiatorName,
}: TxHeaderProps) {
  const headerText = getExpandedHeaderText(tx.type);
  const shortCommitment = formatAddress(initiatorCommitment, { start: 4, end: 4 });
  const { chainId } = useNetworkTokens();

  const renderHeaderRow = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="text-lg font-semibold">
        {tx.type === TxType.BATCH ? (
          <span>{tx.batchData?.length ?? 0} transactions</span>
        ) : (
          <span>
            {headerText} {initiatorName ? `${initiatorName} (${shortCommitment})` : shortCommitment}
          </span>
        )}
      </div>
      {myVoteStatus === null && (
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              onDeny();
            }}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-main-black bg-white rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
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
      )}
    </div>
  );

  if (tx.type === TxType.TRANSFER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-4" key={tx.type}>
          <span className="mr-10">Tranfer</span>
          <Image
            src={getTokenByAddress(tx.tokenAddress, chainId).icon}
            alt={getTokenByAddress(tx.tokenAddress, chainId).symbol}
            width={20}
            height={20}
          />
          <span>{formatAmount(tx.amount ?? "0", chainId, tx.tokenAddress)}</span>
          <Image src="/icons/arrows/arrow-right-long-white.svg" alt="Arrow Right" width={100} height={100} />
          <AddressWithContact address={tx.recipientAddress ?? ""} contactName={tx.contact?.name} className="bg-white" />
        </div>
      </div>
    );
  }

  if (tx.type === TxType.ADD_SIGNER || tx.type === TxType.REMOVE_SIGNER) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <SignerBadgeList signerData={tx.signerData} />
        <ThresholdUpdate oldThreshold={tx.oldThreshold} newThreshold={tx.newThreshold} />
      </div>
    );
  }

  if (tx.type === TxType.SET_THRESHOLD) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="flex items-center gap-3">
          <span className="text-sm text-white font-medium">New Threshold</span>
          <span className="text-sm text-white font-medium">{String(tx.oldThreshold).padStart(2, "0")}</span>
          <Image src="/icons/arrows/arrow-right-long-pink.svg" alt="Arrow Right" width={100} height={100} />
          <span className="text-sm text-white font-medium">{String(tx.newThreshold).padStart(2, "0")}</span>
        </div>
      </div>
    );
  }

  if (tx.type === TxType.BATCH && tx.batchData) {
    return (
      <div className="bg-violet-300 text-white p-4 rounded-lg">
        {renderHeaderRow()}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {tx.batchData.map((transfer, index) => (
            <div className="flex items-center gap-4" key={tx.type + index}>
              <span className="mr-10">Tranfer</span>
              <Image
                src={getTokenByAddress(transfer.tokenAddress, chainId).icon}
                alt={getTokenByAddress(transfer.tokenAddress, chainId).symbol}
                width={20}
                height={20}
              />
              <span>{formatAmount(transfer.amount ?? "0", chainId, transfer.tokenAddress)}</span>
              <Image src="/icons/arrows/arrow-right-long-white.svg" alt="Arrow Right" width={100} height={100} />
              <AddressWithContact
                address={transfer.recipient ?? ""}
                contactName={transfer.contactName}
                className="bg-white"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
