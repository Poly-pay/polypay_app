"use client";

import { useState } from "react";
import { blo } from "blo";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

const textSizeMap = {
  "3xs": "text-[10px]",
  "2xs": "text-[11px]",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
} as const;

const copyIconSizeMap = {
  "3xs": "h-2.5 w-2.5",
  "2xs": "h-3 w-3",
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  base: "h-[18px] w-[18px]",
  lg: "h-5 w-5",
  xl: "h-[22px] w-[22px]",
  "2xl": "h-6 w-6",
  "3xl": "h-[26px] w-[26px]",
} as const;

const avatarSizeMap = {
  "3xs": 16,
  "2xs": 18,
  xs: 20,
  sm: 24,
  base: 28,
  lg: 32,
  xl: 36,
  "2xl": 40,
  "3xl": 48,
} as const;

type CommitmentProps = {
  commitment?: bigint | string;
  label?: string;
  format?: "short" | "long";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  showCopyButton?: boolean;
  showAvatar?: boolean;
};

// Convert commitment to pseudo-address for blo avatar
const commitmentToAddress = (commitment: string): `0x${string}` => {
  const hex = BigInt(commitment).toString(16).padStart(40, "0").slice(-40);
  return `0x${hex}`;
};

export const Commitment = ({
  commitment,
  label,
  format = "short",
  size = "base",
  showCopyButton = true,
  showAvatar = true,
}: CommitmentProps) => {
  const [copied, setCopied] = useState(false);

  // Normalize commitment to string (remove 'n' suffix if bigint string)
  const commitmentStr = commitment ? commitment.toString().replace(/n$/, "") : undefined;

  const shortCommitment = commitmentStr ? `${commitmentStr.slice(0, 8)}...${commitmentStr.slice(-6)}` : undefined;

  const displayCommitment = format === "long" ? commitmentStr : shortCommitment;

  const handleCopy = async () => {
    if (!commitmentStr) return;
    await navigator.clipboard.writeText(commitmentStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Loading skeleton
  if (!commitmentStr) {
    return (
      <div className="flex items-center gap-2">
        {showAvatar && (
          <div
            className="shrink-0 skeleton rounded-full"
            style={{
              width: avatarSizeMap[size],
              height: avatarSizeMap[size],
            }}
          />
        )}
        <div className="flex flex-col gap-1">
          {label && (
            <div className={`skeleton rounded-lg ${textSizeMap[size]}`}>
              <span className="invisible">{label}</span>
            </div>
          )}
          <div className={`skeleton rounded-lg ${textSizeMap[size]}`}>
            <span className="invisible">12345678...123456</span>
          </div>
        </div>
      </div>
    );
  }

  const pseudoAddress = commitmentToAddress(commitmentStr);

  return (
    <div className="flex items-center gap-2">
      {showAvatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="commitment avatar"
          className="rounded-full shrink-0"
          src={blo(pseudoAddress)}
          width={avatarSizeMap[size]}
          height={avatarSizeMap[size]}
        />
      )}
      <div className="flex flex-col">
        {label && <span className={`${textSizeMap[size]} font-bold text-base-content/70`}>{label}</span>}
        <div className="flex items-center gap-1">
          <span className={`${textSizeMap[size]} font-mono text-base-content`} title={commitmentStr}>
            {displayCommitment}
          </span>
          {showCopyButton && (
            <button onClick={handleCopy} className="btn btn-ghost btn-xs p-0 min-h-0 h-auto hover:bg-transparent">
              {copied ? (
                <CheckCircleIcon className={`${copyIconSizeMap[size]} text-success`} />
              ) : (
                <DocumentDuplicateIcon
                  className={`${copyIconSizeMap[size]} text-base-content/50 hover:text-base-content cursor-pointer`}
                />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// List component for multiple commitments
type CommitmentListProps = {
  commitments: (bigint | string)[];
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  showIndex?: boolean;
};

export const CommitmentList = ({ commitments, size = "base", showIndex = true }: CommitmentListProps) => {
  return (
    <div className="flex flex-col gap-2">
      {commitments.map((commitment, index) => (
        <Commitment
          key={index}
          commitment={commitment}
          label={showIndex ? `Commitment-${index + 1}` : undefined}
          size={size}
        />
      ))}
    </div>
  );
};
