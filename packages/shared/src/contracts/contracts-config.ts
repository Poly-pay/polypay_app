export const CONTRACT_CONFIG_BY_CHAIN_ID = {
  2651420: {
    // Horizen testnet
    zkVerifyAddress: "0xCC02D0A54F3184dF4c88811E5b9FAb7ff8131e4a",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    mixerAddress: "0xd9E9103693014b00db0Bf262b65CB2226062e732" as `0x${string}`,
    mixerVkHash:
      "0x29236cc027580a6be3e581d9625a48710d39eb92e2c68e7b5e42841d11affe00" as `0x${string}`,
  },
  84532: {
    // Base Sepolia
    zkVerifyAddress: "0x0807C544D38aE7729f8798388d89Be6502A1e8A8",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    mixerAddress: "0xE146bA86fef4056566D7EE9dBB9fFaCf8A994AC2" as `0x${string}`,
    mixerVkHash:
      "0x29236cc027580a6be3e581d9625a48710d39eb92e2c68e7b5e42841d11affe00" as `0x${string}`,
  },
  26514: {
    // TODO: change address to actual address
    // Horizen mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    mixerAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mixerVkHash:
      "0x29236cc027580a6be3e581d9625a48710d39eb92e2c68e7b5e42841d11affe00" as `0x${string}`,
  },
  8453: {
    // TODO: change address to actual address
    // Base mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0x80aca2e84f244400a76040aa5c77f9d83ff8409a2bf0d0cde96daffcf0a50e1b",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    mixerAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mixerVkHash:
      "0x29236cc027580a6be3e581d9625a48710d39eb92e2c68e7b5e42841d11affe00" as `0x${string}`,
  },
} as const;

// Starting blocks for Mixer deployments; used by backend indexer to avoid scanning from block 0.
export const MIXER_DEPLOYMENT_BLOCK = {
  2651420: 11797624, // Horizen testnet Mixer deploy block
  84532: 38809306, // Base Sepolia Mixer deploy block
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
