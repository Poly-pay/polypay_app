import { horizenTestnet } from "./horizenTestnet";
import { horizenMainnet } from "./horizenMainnet";
import { baseSepolia } from "./baseSepolia";
import { baseMainnet } from "./baseMainnet";

export { horizenTestnet, horizenMainnet, baseSepolia, baseMainnet };

export type NetworkType = "testnet" | "mainnet";
export const NetworkValue = {
  mainnet: "mainnet",
  testnet: "testnet",
};

// Backward-compatible helper used where only Horizen is needed.
export const getChain = (network: NetworkType) => {
  return network === NetworkValue.mainnet ? horizenMainnet : horizenTestnet;
};

// New helper: resolve chain by EVM chainId for multi-chain features.
export const getChainById = (chainId: number) => {
  switch (chainId) {
    case horizenTestnet.id:
      return horizenTestnet;
    case horizenMainnet.id:
      return horizenMainnet;
    case baseSepolia.id:
      return baseSepolia;
    case baseMainnet.id:
      return baseMainnet;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};
