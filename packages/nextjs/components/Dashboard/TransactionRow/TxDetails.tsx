import React from "react";
import Image from "next/image";
import { AddressWithContact } from "./AddressWithContact";
import { TxType, getTokenByAddress } from "@polypay/shared";
import { TransactionRowData, useNetworkTokens } from "~~/hooks";
import { formatAddress, formatAmount } from "~~/utils/format";

export function TxDetails({ tx }: { tx: TransactionRowData }) {
  const { chainId } = useNetworkTokens();
  switch (tx.type) {
    case TxType.TRANSFER:
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src={getTokenByAddress(tx.tokenAddress, chainId).icon}
              alt={getTokenByAddress(tx.tokenAddress, chainId).symbol}
              width={20}
              height={20}
            />
            <span className="font-medium">{formatAmount(tx.amount ?? "0", chainId, tx.tokenAddress)}</span>
          </div>
          <Image src="/icons/arrows/arrow-right-long-purple.svg" alt="Arrow Right" width={100} height={100} />
          <AddressWithContact address={tx.recipientAddress ?? ""} contactName={tx.contact?.name} />
        </div>
      );

    case TxType.ADD_SIGNER:
    case TxType.REMOVE_SIGNER:
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {tx.signerData?.map((signer, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <Image src="/avatars/signer-3.svg" alt="Signer" width={16} height={16} className="rounded-full" />
              <span className="text-[12px]">
                {signer.name ? (
                  <>
                    {signer.name} ({formatAddress(signer.commitment, { start: 4, end: 4 })})
                  </>
                ) : (
                  formatAddress(signer.commitment, { start: 4, end: 4 })
                )}
              </span>
            </div>
          ))}
        </div>
      );

    case TxType.SET_THRESHOLD:
      return (
        <div className="flex items-center gap-3">
          <span className="text-gray-950">{String(tx.oldThreshold).padStart(2, "0")}</span>
          <Image src="/icons/arrows/arrow-right-long-purple.svg" alt="Arrow Right" width={100} height={100} />
          <span className="text-gray-950">{String(tx.newThreshold).padStart(2, "0")}</span>
        </div>
      );

    case TxType.BATCH:
      if (!tx.batchData || tx.batchData.length === 0) {
        return <span className="text-gray-500">No transfers</span>;
      }
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm text-grey-1000 bg-grey-100 px-3 py-1 rounded-3xl">
            {tx.batchData.length} transfer{tx.batchData.length > 1 ? "s" : ""}
          </span>
        </div>
      );
  }
}
