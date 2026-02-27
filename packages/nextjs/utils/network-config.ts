import { NetworkType, getChain } from "@polypay/shared";

export const network = (process.env.NEXT_PUBLIC_NETWORK || "testnet") as NetworkType;
export const chain = getChain(network);
