export const CONTRACT_CONFIG_BY_CHAIN_ID = {
  2651420: {
    // Horizen testnet
    zkVerifyAddress: "0xCC02D0A54F3184dF4c88811E5b9FAb7ff8131e4a",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  84532: {
    // Base Sepolia
    zkVerifyAddress: "0x0807C544D38aE7729f8798388d89Be6502A1e8A8",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  26514: {
    // Horizen mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  8453: {
    // Base mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
} as const;

export const getContractConfigByChainId = (chainId: number) => {
  const config =
    CONTRACT_CONFIG_BY_CHAIN_ID[
      chainId as keyof typeof CONTRACT_CONFIG_BY_CHAIN_ID
    ];
  if (!config) {
    throw new Error(`Unsupported chainId for contract config: ${chainId}`);
  }
  return config;
};
