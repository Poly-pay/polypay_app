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
    // Current build: original STATICCALL-based Poseidon (uses the on-chain
    // poseidon-solidity PoseidonT3 library at `poseidonT3Address`). The
    // in-process Rust Poseidon experiment was reverted — see NOTES.md.
    stylusImplAddress: "0x3e3f8bfb2dc0e2224808fa7da83e1cbbbf0a56ea",
    // Stylus/Rust EIP-1167 factory (packages/stylus-factory) bound to the
    // STATICCALL-Poseidon impl above. Emits byte-identical proxy bytecode to
    // the previous Solidity factory, so accounts created here are
    // indistinguishable on-chain from accounts created against the legacy
    // factory.
    stylusFactoryAddress: "0xe4a4520b1ac45300cbe9d94723780d920681719d",
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
    stylusImplAddress: "0x0000000000000000000000000000000000000000",
    stylusFactoryAddress: "0x0000000000000000000000000000000000000000",
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
