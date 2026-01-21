import { NetworkType } from "../chains";

export const CONTRACT_CONFIG = {
  testnet: {
    zkVerifyAddress: "0xCC02D0A54F3184dF4c88811E5b9FAb7ff8131e4a",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  mainnet: {
    zkVerifyAddress: "", // TODO: add zkverify address for mainnet
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
} as const;

export const getContractConfig = (network: NetworkType) => {
  return CONTRACT_CONFIG[network];
};
