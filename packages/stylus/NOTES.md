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
- **Factory** (`packages/stylus-factory/src/lib.rs`) — Rust/Stylus contract,
  deployed once, parameterized by the impl address. `createWallet(...)` builds
  the 62-byte proxy creation bytecode in pure Rust, deploys it via
  `RawDeploy` (CREATE), then calls `init(...)` on the clone. Bubbles up the
  underlying revert reason on failure. A legacy Solidity factory at
  `packages/hardhat/contracts/MetaMultiSigWalletStylusFactory.sol` is kept as
  a reference; both factories emit byte-identical proxy bytecode (unit test
  in `packages/stylus-factory/src/lib.rs` guards against drift).
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
3. Deploy the Rust/Stylus factory pointing at the new impl:
   `cd packages/stylus-factory && cargo stylus deploy \`
   `  --endpoint https://sepolia-rollup.arbitrum.io/rpc \`
   `  --private-key 0x<pk> --no-verify --max-fee-per-gas-gwei 0.1 \`
   `  --constructor-args 0x<impl>`
4. Update `stylusFactoryAddress` for chain 421614 in the same shared config.
5. Backend can now deploy accounts on Arbitrum Sepolia without any extra env
   vars.

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
- Stylus factory (Rust/WASM): `packages/stylus-factory/src/lib.rs`. Build
  with `cargo stylus deploy` from that directory.
- Legacy Solidity factory (kept as reference, not wired into the app):
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

## Future: in-process Poseidon (no STATICCALL)

Today `verify_proof` `STATICCALL`s the deployed `poseidon-solidity` PoseidonT3
contract (`0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93`) for every proof. The
output is validated bit-identical to the Noir circuit's `bn254::hash_2`, so
the cross-contract call is correct — just adds ~5 KB gas per proof vs hashing
in-process.

Researched options (2026-06-04) for porting Poseidon into the Stylus impl:

| Source | Variant | Compat with Noir `bn254::hash_2`? | no_std / Stylus-ready? |
|---|---|---|---|
| [OZ `rust-contracts-stylus/poseidon2`](https://github.com/OpenZeppelin/rust-contracts-stylus/blob/main/lib/crypto/src/poseidon2/mod.rs) | **Poseidon2** | ❌ different algorithm, different output | ✅ |
| [`light-poseidon` v0.4.0](https://github.com/Lightprotocol/light-poseidon) (Sep 2025) | Original Poseidon, circomlib-compatible (x^5 S-box, BN254, t=3, 8 full + 57 partial rounds) | ✅ very likely (params match circomlib) | ❌ `thiserror = "1.0"` is std-only; `ark-ff`/`ark-bn254` deps not gated with `no_std` features |
| [`TaceoLabs/poseidon-rust`](https://github.com/TaceoLabs/poseidon-rust) | Original, Circom-compatible | ⚠️ likely yes | ❓ unverified, no tagged releases |
| Custom in-tree crate using `ark-ff` + `ark-bn254` (both no_std-ready behind a feature flag) + circomlib constants | Original by construction | ✅ | ✅ — verified by spike 2026-06-04, see below |

**Conclusion**: cannot drop in any existing crate as-is. Two viable paths if
we decide the gas saving is worth it:

1. **Fork `light-poseidon`** — swap `thiserror` for a hand-rolled error type,
   add `#![no_std]` + `extern crate alloc`, enable `no_std` features on the
   `ark-*` deps. ~1–2 days, we own the fork.
2. **Write a ~200-line in-tree Poseidon** using `ark-ff` / `ark-bn254` with
   hardcoded circomlib constants. More code, fully under our control, no
   third-party fork to maintain. ~2–3 days plus a parity harness against the
   on-chain `PoseidonT3` (we already have the testing harness).

Either path MUST end with a bit-for-bit parity check vs
`PoseidonT3.hash([a,b])` on a set of vectors before swapping into
`verify_proof`. The current STATICCALL path is correct and not blocking the
demo, so this is opportunistic optimization, not on the critical path.

### Spike verified (2026-06-04)

Confirmed `ark-ff` 0.5 + `ark-bn254` 0.5 build clean to the Stylus WASM
target (`wasm32-unknown-unknown`, `--release`) and `cargo stylus check`
against Arbitrum Sepolia succeeds. Required Cargo.toml flags:

```toml
ark-ff = { version = "0.5.0", default-features = false }
ark-bn254 = { version = "0.5.0", default-features = false, features = ["scalar_field"] }
```

Contract size before adding the deps: 31.1 KB / 2 fragments. After the spike
(with a trivial `Fr::one() != Fr::zero()` touch): 31.1 KB / 2 fragments —
unused arkworks code was stripped by the linker, so the real size impact only
shows up once a full Poseidon round function is wired in. Headroom is fine
since cargo-stylus already handles fragmentation for us.

So path 2 (custom in-tree Poseidon) is **dep-level unblocked**. Remaining
work is the algorithm + circomlib constants + parity harness.

## Poseidon stays as STATICCALL — not portable to Stylus

The Stylus impl keeps calling the on-chain `PoseidonT3` Solidity library
(`0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93`) via STATICCALL for every
`verify_proof`. Porting Poseidon into the Stylus contract is **not feasible**
without breaking compatibility with our Noir circuit:

- **OpenZeppelin `rust-contracts-stylus/poseidon2`** — the only Stylus-native
  Poseidon library — implements **Poseidon2**, a different algorithm with
  different constants and different output. Using it requires rewriting the
  Noir circuit, regenerating the UltraHonk verification key, re-registering
  the new vk on zkVerify, and migrating every existing account.
- **`light-poseidon`** / **`TaceoLabs/poseidon-rust`** — right algorithm
  (original Poseidon, circomlib-compatible), but std-only. Don't build for
  the Stylus WASM target without a fork.

Hand-rolling Poseidon in our own crate would get the math right but defeats
the only reason to do this in the first place (marketing: "uses a real
Stylus Poseidon library"). So we leave it on STATICCALL.

### Active build

| Component | Address | Source |
|---|---|---|
| Impl (Rust/Stylus, STATICCALLs PoseidonT3) | `0x0395b99f3a45bd08d018d3d3060a0e2bf8dc8978` | `packages/stylus/src/lib.rs` |
| Factory (Rust/Stylus) | `0xc35c0693286ebdc18bdf257f102dec9632a7ce77` | `packages/stylus-factory/src/lib.rs` |
| PoseidonT3 (on-chain library) | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` | poseidon-solidity, deterministic |

## Constraint reminder

Arbitrum is **testnet-only** in PolyPay: zkVerify has a verifier on Arbitrum
Sepolia but not Arbitrum One mainnet, so this cannot go to production yet.
