# Arbitrum Stylus support — status & open decision

Working notes for the `feat/arbitrum-support` branch. The Stylus port of
`MetaMultiSigWallet` works and is validated on-chain; what's left is deciding how
the backend deploys one wallet **per account** on Arbitrum.

## What works (validated on Arbitrum Sepolia, chain 421614)

- Contract written in Rust (`packages/stylus/src/lib.rs`), built against
  `stylus-sdk = 0.10.7` + `alloy = 1.6` (matched to `cargo-stylus` 0.10.x so the
  `#[constructor]` is detected and run on deploy).
- `cargo stylus check` passes; `cargo stylus constructor` prints the 6-arg
  constructor; `cargo stylus deploy --no-verify --max-fee-per-gas-gwei 0.1 --constructor-args ...`
  deploys + activates + runs the constructor in one StylusDeployer tx.
- Test wallet deployed at `0x1e8483112db2c393ef28185768a2aaa52a453b9b` with
  args `(zkv=0xd007..., vkHash=0xb3c5..., poseidonT3=0x3333..., 421614, [1], 1)`.
  On-chain reads confirm state is correct:
  `signaturesRequired=1`, `chainId=421614`, `getCommitments=[1]`.
- **Poseidon parity proven**: `poseidonHash2(1,2)` from the Stylus contract equals
  `PoseidonT3.hash([1,2])` from the deployed library, bit-for-bit. So commitments
  match the Noir circuit's public inputs (this was the main correctness risk).

### On-chain addresses (Arbitrum Sepolia)
- PoseidonT3: `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` (deterministic, deployed
  via `yarn deploy --tags PoseidonT3 --network arbitrumSepolia`)
- zkVerify aggregation (proxy): `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2`
- StylusDeployer (canonical): `0xcEcba2F1DC234f70Dd89F2041029807F8D03A990`
- Test Stylus wallet: `0x1e8483112db2c393ef28185768a2aaa52a453b9b`

## The blocker: per-account auto-deploy from the backend

The relayer deploys a fresh multisig per account. For Arbitrum we wired it to call
`StylusDeployer.deploy(bytecode, initData, ...)` with a single `bytecode` from
`cargo stylus get-initcode`. **That doesn't work** because:

- EVM caps any single contract's code at **24 KB** (`MAX_CODE_SIZE = 24576`).
- Our contract is **~29 KB brotli-compressed** (the on-chain form), so cargo-stylus
  **fragments** it into 2 contracts. `cargo stylus deploy` handles fragments fine
  (hence the test wallet works), but `get-initcode` errors:
  `fragmented contracts not currently supported for initcode retrieval`, and the
  single-call `StylusDeployer.deploy(bytecode)` path can't represent fragments.

### Why we can't just shrink under 24 KB
- `wasm-opt -Oz` cut the **raw** wasm 97 KB → 76 KB (-22%) but the **compressed**
  size barely moved (30.5 KB → 29 KB), because brotli already removes that
  redundancy. Compressed size is what the 24 KB limit measures.
- Removing 8 public getters + the dynamic ABI codec only saved ~0.8 KB compressed.
  The bulk is core logic (alloy ABI codec for `ZkProof`/verifier, `execute`,
  `verify_proof`, keccak, the Stylus runtime) — not removable without gutting the
  multisig. Reaching <24 KB while keeping features is not realistic.

## Options to resume with (decide later)

1. **Proxy factory (preferred — keeps "deploy via bytecode" + all features).**
   Deploy the big Stylus contract once (the impl, e.g. `0x1e84`). Per account,
   deploy a tiny ~45-byte EIP-1167 proxy (well under 24 KB, a normal bytecode
   deploy from the backend) that delegatecalls the impl and keeps its own storage.
   Needs: (a) an `init()` function in the contract (proxies don't run the impl's
   constructor), and (b) **verifying that a Stylus program can be delegatecalled**
   from an EVM proxy on Arbitrum (run the impl's code against the proxy's storage).
   Next experiment: deploy one minimal proxy → delegatecall `0x1e84` → `init()` →
   read state back; if correct, the path is open.

2. **Backend shells out to `cargo stylus deploy`.** Keeps full features + automated,
   but the backend host needs Rust + cargo-stylus installed; slower, hacky.

3. **Manual deploy for the demo.** Pre-deploy a few Arbitrum accounts by hand and
   register their addresses in the DB; account creation through the UI won't
   auto-deploy on Arbitrum.

## Where the code is
- Stylus contract + build/deploy guide: `packages/stylus/` (`src/lib.rs`, `README.md`).
- Shared: `packages/shared/src/chains/arbitrumSepolia.ts`,
  `contracts/contracts-config.ts` (421614 entry),
  `contracts/MetaMultiSigWalletStylus.ts` (StylusDeployer ABI + `isStylusChain`).
- Backend relayer routing: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
  (`deployStylusAccount` — currently assumes single-bytecode; revisit per the
  decision above).
- Frontend: `packages/nextjs/scaffold.config.ts`, `utils/network.ts`.
- PoseidonT3 deploy script: `packages/hardhat/deploy/01_deploy_poseidon_t3.ts`.

## Constraint reminder
Arbitrum is **testnet-only** in PolyPay: zkVerify has a verifier on Arbitrum
Sepolia but not Arbitrum One mainnet, so this cannot go to production yet.
