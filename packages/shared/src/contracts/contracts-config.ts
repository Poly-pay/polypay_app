export const CONTRACT_CONFIG_BY_CHAIN_ID = {
  2651420: {
    // Horizen testnet
    zkVerifyAddress: "0x3098A6974649478f0133046e44105AA84e868C21",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  84532: {
    // Base Sepolia
    zkVerifyAddress: "0x0807C544D38aE7729f8798388d89Be6502A1e8A8",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  26514: {
    // Horizen mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  8453: {
    // Base mainnet
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
  },
  421614: {
    // Arbitrum Sepolia (testnet only — zkVerify has no Arbitrum One mainnet verifier yet).
    // On this chain the account contract is the Stylus (Rust/WASM) port of
    // MetaMultiSigWallet; it STATICCALLs the PoseidonT3 + zkVerify contracts below.
    // zkVerifyAddress: zkVerify aggregation proxy on Arbitrum Sepolia.
    zkVerifyAddress: "0xd007494945580eEb25522c8e0b2fa798B3F0FDE2",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    // PoseidonT3 must be deployed on Arbitrum Sepolia. Use the deterministic
    // address if redeployed via the same CREATE2 factory; otherwise update this.
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
