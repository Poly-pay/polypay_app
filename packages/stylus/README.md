# PolyPay MetaMultiSigWallet — Arbitrum Stylus port

Rust/WASM port of `packages/hardhat/contracts/MetaMultiSigWallet.sol`, deployed on
Arbitrum Stylus. Used as the account contract on Stylus chains (Arbitrum Sepolia,
chain id `421614`). All other chains keep the Solidity contract.

The exported Solidity ABI is identical to the EVM contract for runtime methods
(`execute`, `getTransactionHash`, `getCommitments`, ...), so the frontend (viem)
and backend relayer reuse `METAMULTISIG_ABI` unchanged. The only difference is the
constructor, which takes one extra arg `poseidonT3` (Stylus has no linked
libraries, so the wallet STATICCALLs PoseidonT3 by address):

```
constructor(address zkvContract, bytes32 vkHash, address poseidonT3,
            uint256 chainId, uint256[] initialCommitments, uint256 signaturesRequired)
```

## Why Poseidon is an external call (and what's left as future work)

To eliminate any risk of hash divergence, this port does **not** re-implement
Poseidon in Rust. It STATICCALLs the already-deployed `poseidon-solidity`
PoseidonT3 contract. A STATICCALL to a pure function returns the exact same value
as the Solidity contract's DELEGATECALL into the linked library, so on-chain
commitments match the Noir circuit's public inputs with zero risk.

**Future work (the gas win):** move Poseidon into Rust (e.g. `ark-bn254` field
arithmetic with circom-compatible constants). Before trusting any native
implementation it **must** be checked against a known vector from the current
system, e.g. confirm `poseidonHash2(txHashAsUint, 1)` matches the value the
deployed Solidity contract returns for the same input. Until verified, keep the
external-call version.

## Prerequisites

```bash
rustup target add wasm32-unknown-unknown
cargo install cargo-stylus            # match the version pinned in Cargo.toml
```

## Build & check

```bash
cd packages/stylus

# Compile checks (no cargo-stylus needed):
cargo check                                             # native type-check
cargo build --release --target wasm32-unknown-unknown   # ~101 KB WASM artifact
cargo run --features export-abi                          # print the Solidity ABI

# Stylus-specific (needs cargo-stylus + an RPC endpoint):
cargo stylus check                                      # validates WASM + compressed size limit
cargo stylus export-abi                                 # same ABI, via the tool
```

Built against `stylus-sdk = "0.10.7"` + `alloy = "1.6"` to match `cargo-stylus`
0.10.x — required so the `#[constructor]` is detected and run on deploy (older SDKs
didn't emit it in a way the 0.10 tool reads). If `cargo stylus check` rejects the
WASM for size, tune `[profile.release]` in `Cargo.toml` (already `opt-level = "z"`,
`lto`, `strip`).

Notes for `cargo-stylus >= 0.10`:
- A `Stylus.toml` is required (this repo ships one as a workspace manifest).
- `rust-toolchain.toml` must pin a **specific** version (not `stable`) for
  reproducible builds — set to `1.94.1`; match it to your installed toolchain.

Verified locally: `cargo stylus check` passes — contract size **30.7 KB**,
activation data fee ~0.000174 ETH on Arbitrum Sepolia. `cargo stylus constructor`
prints the 6-arg constructor (so deploy runs it via StylusDeployer).

## Deploy dependencies on Arbitrum Sepolia

The wallet calls two external contracts that must exist on the target chain:

1. **PoseidonT3** — deploy to the deterministic address
   `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` (CREATE2). A tagged hardhat script
   does this:
   ```bash
   cd packages/hardhat
   yarn deploy --tags PoseidonT3 --network arbitrumSepolia
   ```
   It deploys the CREATE2 proxy (if absent) then PoseidonT3, idempotently. If the
   address ends up different, update `poseidonT3Address` for `421614` in
   `packages/shared/src/contracts/contracts-config.ts`.
2. **zkVerify aggregation** — already deployed by zkVerify on Arbitrum Sepolia at
   `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2` (proxy). Confirm this is the
   address that exposes `verifyProofAggregation` and that Kurier relays
   aggregations for `chainId 421614`.

## Deploy the wallet (manual / single account)

```bash
export RPC=https://sepolia-rollup.arbitrum.io/rpc
export PK=0x<deployer-key-with-arb-sepolia-eth>

cargo stylus deploy \
  --endpoint $RPC \
  --private-key $PK \
  --constructor-args \
      <zkvContract> <vkHash> <poseidonT3> <chainId=421614> "[<commitment>...]" <sigsRequired>
```

`cargo stylus deploy` deploys + activates the program and runs the constructor via
the StylusDeployer.

## Wire the backend relayer (per-account auto deploy)

The relayer (`packages/backend/src/relayer-wallet/relayer-wallet.service.ts`)
deploys an account per user on account creation. For Stylus chains it routes
through `StylusDeployer`. Set these env vars on the backend:

```bash
# Stylus deployment bytecode = `cargo stylus get-initcode` output (EVM creation
# prelude + compressed WASM). This is the `bytecode` arg StylusDeployer expects.
STYLUS_MULTISIG_DEPLOY_BYTECODE=$(cd packages/stylus && cargo stylus get-initcode)
# Optional: override the StylusDeployer address (default is the canonical one).
STYLUS_DEPLOYER_ADDRESS=0xcEcba2F1DC234f70Dd89F2041029807F8D03A990
```

The relayer builds the StylusDeployer `initData` as `selector("stylus_constructor()")`
+ ABI-encoded constructor args (matching stylus-tools), and uses the canonical
deployer `0xcEcba2F1DC234f70Dd89F2041029807F8D03A990` with a zero salt.

Also fund the relayer wallet (`RELAYER_WALLET_KEY`) with Arbitrum Sepolia ETH so
it can pay deploy + execute gas.

## End-to-end test flow (staging/testnet)

1. Set `NEXT_PUBLIC_NETWORK=testnet` (frontend) and `NETWORK=testnet` (backend) so
   Arbitrum Sepolia appears in the network list.
2. Deploy PoseidonT3 on Arbitrum Sepolia; set `STYLUS_MULTISIG_DEPLOY_BYTECODE`.
3. In the app: create an account, pick **Arbitrum Sepolia** → relayer deploys the
   Stylus wallet. Confirm the deployed address on the Arbitrum Sepolia explorer.
4. Deposit ETH to the account, then submit a transfer. The flow: frontend builds
   `getTransactionHash` → ZK proof → Kurier aggregation (`chainId 421614`) →
   relayer calls `execute`. Confirm the tx succeeds on-chain.
5. Verify the same flows the EVM chains support: single transfer, batch transfer,
   add/remove signer, update threshold.
