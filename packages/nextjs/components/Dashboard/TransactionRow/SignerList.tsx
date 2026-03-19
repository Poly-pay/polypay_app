import React from "react";
import { VoteBadge } from "./Badges";
import { TxStatus } from "@polypay/shared";
import { Member, VoteStatus } from "~~/hooks";
import { formatAddress } from "~~/utils/format";

interface SignerWithStatus {
  commitment: string;
  name?: string | null;
  isInitiator: boolean;
  isMe: boolean;
  voteStatus: VoteStatus | "waiting";
}

export function SignerList({
  members,
  allSigners,
  votedCount,
  threshold,
  totalSigners,
  myCommitment,
  initiatorCommitment,
  txStatus,
}: {
  members: Member[];
  allSigners: string[];
  votedCount: number;
  threshold: number;
  totalSigners: number;
  myCommitment: string;
  initiatorCommitment: string;
  txStatus: TxStatus;
}) {
  const signersWithStatus: SignerWithStatus[] =
    txStatus === TxStatus.EXECUTED || txStatus === TxStatus.FAILED
      ? members.map(member => ({
          commitment: member.commitment,
          name: member.name || null,
          isInitiator: member.commitment === initiatorCommitment,
          isMe: member.commitment === myCommitment,
          voteStatus: member.voteStatus,
        }))
      : allSigners.map(commitment => {
          const voted = members.find(m => m.commitment === commitment);
          return {
            commitment,
            name: voted?.name || null,
            isInitiator: commitment === initiatorCommitment,
            isMe: commitment === myCommitment,
            voteStatus: voted?.voteStatus || "waiting",
          };
        });

  return (
    <div className="flex flex-col p-4 gap-2 border border-grey-200 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-grey-900 tracking-tight">Signers</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-grey-400 tracking-tight">
            Voted{" "}
            <span className="text-grey-800 font-medium">
              {votedCount}/{totalSigners}
            </span>
          </span>
          <span className="text-grey-400 tracking-tight">
            Threshold{" "}
            <span className="text-grey-800 font-medium">
              {threshold}/{totalSigners}
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {signersWithStatus.map((signer, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-grey-800 tracking-tight">
                {signer.name ? (
                  <>
                    {signer.name} ({formatAddress(signer.commitment, { start: 4, end: 4 })})
                  </>
                ) : (
                  formatAddress(signer.commitment, { start: 4, end: 4 })
                )}
              </span>
              {signer.isMe && <span className="text-sm font-medium text-pink-350 tracking-tight">[you]</span>}
              {signer.isInitiator && (
                <span className="text-sm font-medium text-main-navy-blue tracking-tight">[Transaction Initiator]</span>
              )}
            </div>
            <VoteBadge status={signer.voteStatus} />
          </div>
        ))}
      </div>
    </div>
  );
}
