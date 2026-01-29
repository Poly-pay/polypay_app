import { horizenTestnet } from "./horizenTestnet";
import { horizenMainnet } from "./horizenMainnet";

export { horizenTestnet, horizenMainnet };

export type NetworkType = "testnet" | "mainnet";
export const NetworkValue = {
  mainnet: "mainnet",
  testnet: "testnet",
};

export const getChain = (network: NetworkType) => {
  return network === NetworkValue.mainnet ? horizenMainnet : horizenTestnet;
};
