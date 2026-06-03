# Arbitrum Stylus support — status

Working notes for the `feat/arbitrum-support` branch. The Stylus port of
`MetaMultiSigWallet` is wired end-to-end: per-account wallets are created as
EIP-1167 minimal proxies in front of a single Stylus implementation, so account
creation and `execute` both flow through normal EVM tooling on Arbitrum.

## Architecture

- **Stylus impl** (`packages/stylus/src/lib.rs`) — deployed ONCE per chain via
  `cargo stylus deploy`. Holds all the WASM logic (signer set, nonce/nullifier
  tracking, ZK proof verification through zkVerify, batch transfers). Exposes
  both `constructor(...)` (used at impl deploy by cargo-stylus) and `init(...)`
  with identical args; an `initialized` storage flag guards against double
  init.
- **Factory** (`packages/hardhat/contracts/MetaMultiSigWalletStylusFactory.sol`)
  — deployed once, parameterized by the impl address. `createWallet(...)`
  clones an EIP-1167 minimal proxy (~45 bytes of EVM bytecode, well under the
  24 KB cap) and atomically calls `init(...)` on the clone via delegatecall.
  Bubbles up the underlying revert reason on failure.
- **Per account** — every PolyPay account on Arbitrum Sepolia is one EIP-1167
  proxy with its own storage (signers/nonces/nullifiers) delegating into the
  shared impl's WASM. `execute(...)` calls go through the proxy and are
  delegatecalled into the Stylus runtime, which sees the proxy's storage as
  its own — confirmed compatible per the Stylus Saturdays "Writing proxies in
  Arbitrum Stylus" issue (2024-09-21).

## Why this shape

- The Stylus impl is ~29 KB brotli-compressed (the on-chain form), above the
  24 KB EVM code-size limit, so cargo-stylus fragments it across two
  contracts. That makes the single-bytecode `StylusDeployer.deploy(bytecode,
  initData, ...)` path unusable for per-account creation: `cargo stylus
  get-initcode` errors with "fragmented contracts not currently supported".
- Shrinking under 24 KB was not realistic: `wasm-opt -Oz` cut the raw wasm 97 KB
  → 76 KB (-22%) but compressed size barely moved (30.5 KB → 29 KB) because
  brotli already removes that redundancy, and dropping public getters / the
  dynamic ABI codec only saved ~0.8 KB compressed. The bulk is core multisig
  logic + alloy ABI codec for `ZkProof` + keccak + Stylus runtime.
- EIP-1167 sidesteps the limit entirely — the proxy is plain EVM bytecode,
  unfragmented, and the impl is deployed exactly once.

## Operational steps

1. Deploy the Stylus impl: `cd packages/stylus && cargo stylus deploy
   --no-verify --max-fee-per-gas-gwei 0.1 --constructor-args <args>`. Use any
   valid set of constructor args (e.g. the existing test args); the impl's own
   storage is unused since all live state lives in proxies.
2. Update `stylusImplAddress` for chain 421614 in
   `packages/shared/src/contracts/contracts-config.ts` with the new impl
   address.
3. Deploy the factory:
   `STYLUS_IMPL_ADDRESS=0x<impl> yarn deploy --tags StylusFactory --network arbitrumSepolia`
4. Update `stylusFactoryAddress` for chain 421614 in the same shared config.
5. Backend can now deploy accounts on Arbitrum Sepolia without any extra env
   vars; an optional `STYLUS_FACTORY_ADDRESS` env override is available for
   pointing at a custom factory.

### On-chain reference addresses (Arbitrum Sepolia, chain 421614)

- PoseidonT3 (deterministic): `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93`
  (deploy via `yarn deploy --tags PoseidonT3 --network arbitrumSepolia`)
- zkVerify aggregation (proxy): `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2`
- Stylus impl: redeploy from this branch (has `init()` + `initialized` guard);
  the previous test wallet at `0x1e8483112db2c393ef28185768a2aaa52a453b9b` was
  the pre-proxy version.

## Code map

- Stylus impl + build/deploy guide: `packages/stylus/` (`src/lib.rs`,
  `README.md`).
- Factory contract + deploy script:
  `packages/hardhat/contracts/MetaMultiSigWalletStylusFactory.sol`,
  `packages/hardhat/deploy/02_deploy_stylus_factory.ts`.
- Shared addresses + ABIs: `packages/shared/src/chains/arbitrumSepolia.ts`,
  `contracts/contracts-config.ts` (421614 entry,
  `stylusImplAddress`/`stylusFactoryAddress`),
  `contracts/MetaMultiSigWalletStylus.ts` (factory ABI + `isStylusChain`).
- Backend relayer: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
  (`deployStylusAccount` now routes through `factory.createWallet`).
- Frontend: `packages/nextjs/scaffold.config.ts`, `utils/network.ts`.
- PoseidonT3 deploy script: `packages/hardhat/deploy/01_deploy_poseidon_t3.ts`.

## Open issue — `execute()` self-call reverts with `WalletError("Tx failed")`

Submitting an `add_signer` (or any onlySelf) transaction through `execute()` on
the Arbitrum proxy reverts with `0x78cd39ed` = `WalletError(string)` payload
`"Tx failed"`. That string only comes from the `.map_err(|_| err("Tx failed"))`
wrapper around the inner self-call in `execute()`, so the actual revert is
swallowed at that layer.

### What we observed (not a confirmed root-cause — just a guess)

`eth_call` probes on Arbitrum Sepolia against proxy
`0x44Fe2002723a7975cefc784DFeF101c1D523Ac91` (impl
`0x0907a7c0e73ef119d06e082914fc83aad1465aae`):

- `addSigners(...)` direct, `from = proxy` → succeeds (so the function body
  itself and `only_self()` are fine when `msg.sender == address(this)`).
- `addSigners(...)` direct, `from = impl` or `from = relayer EOA` →
  `WalletError("Not Self")`.
- Full `execute(...)` end-to-end → `WalletError("Tx failed")` (= inner call
  reverted, original reason hidden).

### Working hypothesis

When the Stylus impl runs in the proxy's delegatecall context and issues an
outgoing `CALL` via `Call::new_payable(self, value)` + `call(...)`, the
`msg.sender` of the new frame may not be `address(this)` (= proxy address) as
standard EVM semantics would dictate. If Stylus's CALL host uses a cached
"self address" set at activation (= impl address) instead of reading
`address(this)` at runtime, the inner call would arrive at the proxy with
`msg.sender = impl`, which delegatecalls back into the impl with that same
`msg.sender`, failing `only_self()`.

**This is a guess, not verified.** We did NOT:
- Instrument the impl to log `msg.sender` of the inner frame
- Inspect Stylus SDK / Nitro source to confirm the host call sets `msg.sender`
  to address(this) at runtime vs. a cached value
- File or find a matching upstream issue (issue #4114 on `OffchainLabs/nitro`
  about Stylus-to-Stylus revert/return data being lost is in the same area but
  isn't the same bug)

The pattern works fine on the original Solidity contract (Horizen/Base), where
`address(this).call(data)` from a delegatecalled implementation correctly
delivers `msg.sender = address(this)`.

### Status after the workaround

On-chain results after deploying the new impl (with `dispatch_self_call`) and
factory:

- **`batch_transfer` via `execute()` → PASS** on Arbitrum Sepolia. So the
  internal dispatcher reaches the `*_internal` helpers and storage / external
  CALLs from there work fine.
- **`add_signer` via `execute()` → still reverts with
  `WalletError("Tx failed")`**. Same selector as before. We did not dig
  further — left as an open core-team item.

Possible directions (NOT investigated):
- Difference between `add_signers_internal` and `batch_transfer_internal` is
  mostly that the former mutates `commitments: uint256[]` storage (push) and
  emits an `Owner` event per element, while the latter makes external CALLs.
  Maybe Stylus storage array push under delegatecall has an issue, or the ABI
  decode of `uint256[]` in `dispatch_self_call` (hand-rolled) is wrong for
  some encoding.
- Verify the decoded `(commitments, sig_required)` from the inner self-call
  calldata matches what was submitted — could be off-by-one in the offset
  math.
- Try `remove_signers` / `update_signatures_required` to narrow which
  internal is broken.

### Workaround (implemented in lib.rs — partially works)

`execute()` detects `to == self.vm().contract_address()` and routes the call
through a Rust-level dispatcher (`dispatch_self_call`) that matches the
selector against the onlySelf functions and invokes their `*_internal`
helpers directly. This bypasses the EVM `CALL` round-trip entirely, so
whatever Stylus is doing wrong with `msg.sender` in delegatecall-then-CALL no
longer matters for self-calls.

Each onlySelf public method (`add_signers`, `remove_signers`,
`update_signatures_required`, `batch_transfer`, `batch_transfer_multi`) is now
a thin wrapper that runs `only_self()` and delegates to its `*_internal`
sibling. External direct calls keep their `only_self()` protection unchanged;
only the in-process self-call from `execute()` bypasses it (and execute's own
ZK-proof gating provides the access control).

`dispatch_self_call` hand-rolls Solidity ABI decoding for the static set of
parameter shapes used (`uint256`, `uint256[]`, `address[]`) to avoid pulling
the full alloy ABI codec into the WASM (the impl is already over the 24 KB
fragmentation threshold).

Re-deploy is required (impl bytecode changed). Factory does not need to
change. Update `stylusImplAddress` in
`packages/shared/src/contracts/contracts-config.ts` after re-deploy.

## Constraint reminder

Arbitrum is **testnet-only** in PolyPay: zkVerify has a verifier on Arbitrum
Sepolia but not Arbitrum One mainnet, so this cannot go to production yet.
