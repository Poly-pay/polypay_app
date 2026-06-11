# Arbitrum Stylus support

Stylus (Rust/WASM) port of `MetaMultiSigWallet` for Arbitrum. Each PolyPay
account is an EIP-1167 minimal proxy in front of one shared Stylus impl, so
account creation and `execute()` use normal EVM tooling.

Runs on Arbitrum Sepolia, and on Arbitrum One after slimming the impl under the
24 KiB code-size limit — see "Arbitrum One code-size limit" below.

## How it fits together

- **Impl** — `packages/stylus/src/lib.rs`. Deployed once per chain via
  `cargo stylus deploy`. Holds all logic (signers, nonces/nullifiers, ZK proof
  verification, batch transfers). Has `constructor(...)` (run at deploy) and
  `init(...)` (run on each clone); an `initialized` flag blocks double-init.
- **Factory** — `packages/stylus-factory/src/lib.rs`. Deployed once, bound to
  the impl address. `createWallet(...)` deploys an EIP-1167 proxy and `init`s
  it in one tx.
- **Per account** — one EIP-1167 proxy with its own storage, delegatecalling
  into the shared impl.

Why a proxy instead of a fresh Stylus contract per account: the impl is ~31 KB
compressed (>24 KB EVM limit), so cargo-stylus fragments it and the
single-bytecode deploy path can't be used per-account. The proxy is plain EVM
bytecode and sidesteps this.

## Deploy

Use `packages/stylus/deploy-arbitrum-sepolia.sh` — deploys impl + factory and
patches `stylusImplAddress` / `stylusFactoryAddress` (chain 421614) in
`packages/shared/src/contracts/contracts-config.ts`.

```bash
export PK=0x<deployer-key-with-arb-sepolia-eth>
bash packages/stylus/deploy-arbitrum-sepolia.sh
```

PoseidonT3 must already be on-chain (deterministic
`0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93`; redeploy with
`yarn deploy --tags PoseidonT3 --network arbitrumSepolia` if missing).

## Self-call routing (onlySelf functions)

`execute()` routes a self-call (`to == address(this)`) for the onlySelf
functions (`addSigners`, `removeSigners`, `updateSignaturesRequired`,
`batchTransfer`, `batchTransferMulti`) through `dispatch_self_call` instead of
an EVM `CALL`: it matches the 4-byte selector, decodes the calldata, and calls
the matching `*_internal` helper directly. This avoids a Stylus
delegatecall-context `msg.sender` quirk that broke the original
`address(this).call(...)` path. Covered by unit tests in `src/lib.rs`.

## Poseidon: STATICCALL only

`verify_proof` STATICCALLs the on-chain PoseidonT3 library. Porting Poseidon
into the impl was researched and rejected: the only Stylus-native lib (OZ
`poseidon2`) is a different algorithm with different output (would require
rewriting the Noir circuit + new vk + account migration); the
circomlib-compatible Rust libs are std-only. STATICCALL is correct and not a
bottleneck, so it stays.

## Active build (slim impl, 24295 bytes)

Arbitrum Sepolia (421614):

| Component | Address |
|---|---|
| Impl | `0x61fddf7cde02d4527b7d1086671d3f948e59f1d1` |
| Factory | `0x73d33f803600087ed1259035f9ff46f16f15c11a` |
| PoseidonT3 | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` |
| zkVerify aggregation | `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2` |

Arbitrum One (42161), deployed 2026-06-10:

| Component | Address |
|---|---|
| Impl | `0x49e772bd7efd483c043402331fbf03533852850f` |
| Factory | `0x740b6a46585474eb113f81999c1117e69d4be1be` |
| PoseidonT3 | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` |
| zkVerify aggregation | `0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69` |

## Code map

- Impl + build guide: `packages/stylus/` (`src/lib.rs`, `README.md`)
- Factory: `packages/stylus-factory/src/lib.rs`
- Shared config: `packages/shared/src/contracts/contracts-config.ts` (421614),
  `chains/arbitrumSepolia.ts`, `contracts/MetaMultiSigWalletStylus.ts`
- Relayer: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
  (`deployStylusAccount` -> `factory.createWallet`)
- Frontend: `packages/nextjs/scaffold.config.ts`, `utils/network.ts`

## Arbitrum One code-size limit — resolved by slimming the impl

The brotli-compressed Stylus code-size limit is 24576 bytes (24 KiB), same as
the EVM; deploying over it reverts with empty `execution reverted, data: "0x"`.
The original impl was 31202 bytes (2 fragments) and would not deploy to
Arbitrum One. ArbOS 60 "Elara" raises this limit (live on Arbitrum Sepolia
2026-05-18, not yet on Arbitrum One, pending an on-chain vote with no firm
date), but instead the impl was slimmed to 24295 bytes (1 fragment), which
deploys on Arbitrum One today without waiting for ArbOS 60.

How the impl was slimmed (31202 -> 24295 bytes):
- Removed the on-chain events (Deposit / TransactionExecuted / Owner). The app
  tracks transactions via the backend DB + relayer, not on-chain logs, so there
  is no functional impact. Largest saving (~6 KB — alloy event encoding for
  dynamic bytes).
- Hand-rolled the PoseidonT3 and zkVerify STATICCALLs instead of the generated
  `sol_interface!` bindings (internal only, no ABI change).

Kept unchanged: execute (same ABI, `ZkProof[]`), transfer, batch_transfer,
batch_transfer_multi, signer management, getters, proof verification. No backend
or frontend changes required (only the events were dropped from the ABI).

Margin is 281 bytes under 24576. Future additions can push it back over the
limit (-> 2 fragments -> will not deploy on Arbitrum One until ArbOS 60).

Tested on Arbitrum Sepolia 2026-06-10: a new account against the slim impl ran a
transfer and a batch successfully (proof verification passed), confirming the
hand-rolled poseidon/zkVerify calls.

References:
- 24 KB Stylus limit: https://docs.arbitrum.io/stylus/how-tos/optimizing-binaries
- ArbOS 60 (raises the limit): https://docs.arbitrum.io/notices/arbos60-upgrade-notice

Next: deploy the slim impl to Arbitrum One via `deploy-arbitrum-one.sh`, then run
the same transfer/batch test on Arbitrum One.

The slimming is a temporary measure to fit the current 24 KiB limit. Once ArbOS
60 is live on Arbitrum One (`stylusVersion()` returns 3, the limit is raised),
revert the slim changes — restore the on-chain events (Deposit /
TransactionExecuted / Owner); the `sol_interface!` hand-roll can stay since it
has no functional downside — then redeploy the full impl on both chains. The
pre-slim impl is the parent commit of the slimming commit.
