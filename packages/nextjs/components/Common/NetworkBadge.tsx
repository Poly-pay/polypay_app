"use client";

import React from "react";
import Image from "next/image";
import { getNetworkBadgeSrc } from "~~/utils/network";

interface NetworkBadgeProps {
  chainId?: number;
  size?: number;
  className?: string;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ chainId, size = 16, className }) => {
  if (!chainId) return null;

  const src = getNetworkBadgeSrc(chainId);

  return (
    <div className={className}>
      <Image src={src} alt="Network badge" width={size} height={size} className="rounded-full" />
    </div>
  );
};

export default NetworkBadge;
