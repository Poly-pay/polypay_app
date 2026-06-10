# Arbitrum Stylus support

Stylus (Rust/WASM) port of `MetaMultiSigWallet` for Arbitrum. Each PolyPay
account is an EIP-1167 minimal proxy in front of one shared Stylus impl, so
account creation and `execute()` use normal EVM tooling.

Stylus runs on Arbitrum Sepolia only. Arbitrum One is blocked by the Stylus
code-size limit — see "Arbitrum One blocker" below.

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

## Active build (Arbitrum Sepolia, 421614)

| Component | Address |
|---|---|
| Impl | `0x3e3f8bfb2dc0e2224808fa7da83e1cbbbf0a56ea` |
| Factory | `0xe4a4520b1ac45300cbe9d94723780d920681719d` |
| PoseidonT3 | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` |
| zkVerify aggregation | `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2` |

## Code map

- Impl + build guide: `packages/stylus/` (`src/lib.rs`, `README.md`)
- Factory: `packages/stylus-factory/src/lib.rs`
- Shared config: `packages/shared/src/contracts/contracts-config.ts` (421614),
  `chains/arbitrumSepolia.ts`, `contracts/MetaMultiSigWalletStylus.ts`
- Relayer: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
  (`deployStylusAccount` -> `factory.createWallet`)
- Frontend: `packages/nextjs/scaffold.config.ts`, `utils/network.ts`

## Arbitrum One blocker — Stylus code-size limit

As of 2026-06-10 the Stylus impl does not deploy to Arbitrum One: the deploy
reverts with empty `execution reverted, data: "0x"`. The brotli-compressed
Stylus code-size limit is 24576 bytes (24 KiB), same as the EVM. The impl is
31202 bytes (2 fragments), over the limit. zkVerify mainnet is available on
Arbitrum One; the size limit is the only blocker.

Findings:
- `stylusVersion()` on ArbWasm (`0x...071`): Arbitrum One = 2, Arbitrum Sepolia = 3.
- The limit is 24576 bytes: on Arbitrum One a 24323-byte contract (1 fragment)
  deploy-estimates successfully; a 24618-byte contract (2 fragments) reverts `0x`.
- The revert is at code storage, not activation: `--no-activate` still reverts,
  and a small Stylus contract deploys on Arbitrum One.

**ArbOS 60 "Elara"** raises the Stylus code-size limit. Live on Arbitrum
Sepolia since 2026-05-18 (why the 31 KB impl deploys there). NOT yet on
Arbitrum One — pending an on-chain Constitutional vote; **no firm mainnet date**.
- Upgrade notice: https://docs.arbitrum.io/notices/arbos60-upgrade-notice
- AIP / governance status: https://forum.arbitrum.foundation/t/constitutional-aip-arbos-60-elara/30601
- 24 KB Stylus limit: https://docs.arbitrum.io/stylus/how-tos/optimizing-binaries

Options for Arbitrum One:
1. Wait for ArbOS 60 on Arbitrum One, then redeploy the same impl — no code
   change. ETA unknown (governance).
2. Ship the Solidity `MetaMultiSigWallet.sol` on Arbitrum One instead (EVM
   bytecode is under 24 KB), keeping Stylus only on Arbitrum Sepolia. Works on
   the same deploy path as Base/Horizen; PoseidonT3 is already deployed on
   Arbitrum One. Trade-off: the mainnet wallet would be EVM, not Stylus.
3. Shrink the impl under 24576 bytes compressed — impractical without cutting
   features (best wasm-opt result was ~29 KB compressed).

Decision (2026-06-10): option 1. Stylus on mainnet is required, so the Solidity
wallet (option 2) is not used. Arbitrum One mainnet is deferred until ArbOS 60
activates there; Phase 1 wiring stays in place, deploy via
`deploy-arbitrum-one.sh` once `stylusVersion()` on Arbitrum One returns 3.
