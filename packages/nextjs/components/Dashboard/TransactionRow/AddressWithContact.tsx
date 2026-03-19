import React from "react";
import { formatAddress } from "~~/utils/format";

export function AddressWithContact({
  address,
  contactName,
  className,
}: {
  address: string;
  contactName?: string;
  className?: string;
}) {
  if (contactName) {
    return (
      <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
        <span className="font-medium">{contactName}</span>
        <span className="text-main-black ml-1">({formatAddress(address, { start: 3, end: 3 })})</span>
      </span>
    );
  }
  return (
    <span className={`text-sm text-main-black bg-grey-100 px-5 py-1 rounded-3xl ${className}`}>
      {formatAddress(address, { start: 3, end: 3 })}
    </span>
  );
}
