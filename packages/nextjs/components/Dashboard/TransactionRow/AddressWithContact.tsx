import React from "react";
import { formatAddress } from "~~/utils/format";

export function AddressWithContact({
  address,
  contactName,
  className,
  showRecipientDot = false,
}: {
  address: string;
  contactName?: string;
  className?: string;
  // Renders a small green dot next to the pill — used when the current user
  // is the stealth recipient of this tx, so they notice they have something
  // to claim and expand the row for the Umbra link.
  showRecipientDot?: boolean;
}) {
  const dot = showRecipientDot ? (
    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" aria-label="You receive" />
  ) : null;

  if (contactName) {
    return (
      <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
        {dot}
        <span className="font-medium">{contactName}</span>
        <span className="text-main-black ml-1">({formatAddress(address, { start: 3, end: 3 })})</span>
      </span>
    );
  }
  return (
    <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
      {dot}
      {formatAddress(address, { start: 3, end: 3 })}
    </span>
  );
}
