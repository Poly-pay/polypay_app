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
    // Arbitrum Sepolia (testnet; Arbitrum One mainnet 42161 is below).
    // On this chain the account contract is the Stylus (Rust/WASM) port of
    // MetaMultiSigWallet, deployed once as `stylusImplAddress` and fronted by
    // EIP-1167 minimal proxies created per-account through `stylusFactoryAddress`.
    // The Stylus impl STATICCALLs the PoseidonT3 + zkVerify contracts below.
    zkVerifyAddress: "0xd007494945580eEb25522c8e0b2fa798B3F0FDE2",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    // PoseidonT3 must be deployed on Arbitrum Sepolia. Use the deterministic
    // address if redeployed via the same CREATE2 factory; otherwise update this.
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    // Stylus MetaMultiSigWallet impl (deployed via `cargo stylus deploy`).
    // STATICCALLs the on-chain poseidon-solidity PoseidonT3 library at
    // `poseidonT3Address` for ZK proof verification.
    stylusImplAddress: "0x61fddf7cde02d4527b7d1086671d3f948e59f1d1",
    // Stylus/Rust EIP-1167 factory (packages/stylus-factory) bound to the impl
    // above. Emits byte-identical proxy bytecode to the reference Solidity
    // factory, so accounts created here are indistinguishable on-chain.
    stylusFactoryAddress: "0x73d33f803600087ed1259035f9ff46f16f15c11a",
  },
  42161: {
    // Arbitrum One mainnet. Account contract is the Stylus (Rust/WASM) port,
    // same as Arbitrum Sepolia. zkVerify aggregation + vkHash match the other
    // mainnets (Horizen/Base); PoseidonT3 is the deterministic CREATE2 address.
    zkVerifyAddress: "0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69",
    vkHash:
      "0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38",
    poseidonT3Address: "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93",
    // Deployed in Phase 2 via cargo stylus on Arbitrum One. Zero-address
    // sentinel until then (getStylusFactoryAddress throws on zero).
    stylusImplAddress: "0x49e772bd7efd483c043402331fbf03533852850f",
    stylusFactoryAddress: "0x740b6a46585474eb113f81999c1117e69d4be1be",
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

// Returns the Stylus factory address for a chain whose account contract is the
// Stylus port. Throws if the chain is not Stylus-backed or the factory has not
// been wired yet (zero address sentinel).
export const getStylusFactoryAddress = (chainId: number): `0x${string}` => {
  const config = getContractConfigByChainId(chainId) as {
    stylusFactoryAddress?: string;
  };
  const addr = config.stylusFactoryAddress;
  if (!addr || addr === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      `stylusFactoryAddress is not configured for chainId ${chainId}`,
    );
  }
  return addr as `0x${string}`;
};
