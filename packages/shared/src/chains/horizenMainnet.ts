import { defineChain } from "viem";

export const horizenMainnet = defineChain({
  id: 26514,
  name: "Horizen Mainnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://horizen.calderachain.xyz/http"],
      webSocket: ["wss://horizen.calderachain.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Horizen Explorer",
      url: "https://horizen.calderaexplorer.xyz",
    },
  },
  testnet: false,
});
