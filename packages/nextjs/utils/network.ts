import { NetworkType, NetworkValue } from "@polypay/shared";

type NetworkMeta = {
  name: string;
  icon: string;
  badge: string;
};

const NETWORK_META_BY_CHAIN_ID: Record<number, NetworkMeta> = {
  // Horizen
  26514: {
    name: "Horizen",
    icon: "/token/zen.svg",
    badge: "/token/horizen-badge.svg",
  },
  2651420: {
    name: "Horizen Testnet",
    icon: "/token/zen.svg",
    badge: "/token/horizen-badge.svg",
  },
  // Base
  8453: {
    name: "Base",
    icon: "/token/base.svg",
    badge: "/token/base.svg",
  },
  84532: {
    name: "Base Sepolia",
    icon: "/token/base.svg",
    badge: "/token/base.svg",
  },
};

export const getDefaultChainId = (): number => {
  const network = (process.env.NEXT_PUBLIC_NETWORK || NetworkValue.testnet) as NetworkType;

  return network === NetworkValue.mainnet ? 26514 : 2651420;
};

export const getNetworkMeta = (chainId: number): NetworkMeta => {
  const meta = NETWORK_META_BY_CHAIN_ID[chainId];

  if (!meta) {
    // Fallback: treat as Horizen mainnet for now
    return NETWORK_META_BY_CHAIN_ID[26514];
  }

  return meta;
};

export const getNetworkBadgeSrc = (chainId: number): string => {
  return getNetworkMeta(chainId).badge;
};
