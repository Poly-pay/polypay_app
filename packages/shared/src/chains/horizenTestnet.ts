import { defineChain } from "viem";

export const horizenTestnet = defineChain({
  id: 2651420,
  name: "Horizen Testnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://horizen-testnet.rpc.caldera.xyz/http"],
      webSocket: ["wss://horizen-testnet.rpc.caldera.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Horizen Explorer",
      url: "https://horizen-testnet.explorer.caldera.xyz",
    },
  },
  testnet: true,
});
