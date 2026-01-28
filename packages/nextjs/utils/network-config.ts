import { NetworkType, getChain, getContractConfig } from "@polypay/shared";

export const network = (process.env.NEXT_PUBLIC_NETWORK || "testnet") as NetworkType;
export const chain = getChain(network);
export const contractConfig = getContractConfig(network);
