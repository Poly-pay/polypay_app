# Arbitrum Stylus Support

## Overview

PolyPay supports **Arbitrum Sepolia** (chain ID 421614) as a destination chain
for multisig accounts, in addition to Horizen and Base. Most flows (create
account, deposit / send ETH and USDC, propose / approve / execute transfers
and batch transfers) work the same as on the other chains; **add / remove
signer and update-threshold are currently broken on Arbitrum only** — see the
[caveat below](#add--remove-signer-is-currently-broken).

The only structural difference vs. Horizen / Base is that the account contract
is a Rust/WASM port of `MetaMultiSigWallet` deployed via
[Arbitrum Stylus](https://arbitrum.io/stylus) instead of Solidity, fronted by
a per-account EIP-1167 proxy.

Arbitrum is **testnet only** in PolyPay: zkVerify has a verifier on Arbitrum
Sepolia but not Arbitrum One mainnet, so production use is not possible yet.

## For end users — just pick it in the UI

There is **no setup**. Pick "Arbitrum Sepolia" in the network chooser when
creating an account; everything else works the same as Horizen / Base:

| Step | What happens |
|------|--------------|
| Create account | Backend relayer calls the on-chain factory, which clones a tiny EIP-1167 proxy in front of the shared Stylus implementation and initializes it with your commitment(s). |
| Send / receive ETH or USDC | Plain wallet transfers to the proxy address. ETH and Circle USDC (`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`) are the supported tokens. Gasless x402 deposit is **not** supported on Arbitrum (Base only). |
| Propose / approve | Same ZK-proof flow as the other chains; the proof targets zkVerify aggregation domain **4** (Arbitrum Sepolia). |
| Execute | Relayer calls `execute(...)` on the proxy once the aggregation receipt is published. |

Fund the account from any wallet (MetaMask, Rabby, …) by sending Arbitrum
Sepolia ETH to the proxy address shown in the account detail page.

### One thing to be aware of: aggregation cadence

zkVerify publishes aggregation receipts to Arbitrum Sepolia **at most every 6
hours** ([kurier docs][zkv-cadence]). So a freshly-submitted transaction can
sit in "pending aggregation" for hours before `execute()` becomes possible. For
fast end-to-end demos, prefer Horizen Testnet (≈2 min cadence).

[zkv-cadence]: https://testnet.kurier.xyz/docs/FAQ#5-how-long-does-it-take-for-an-aggregation-to-finalize

### Add / remove signer is currently broken

Executing **`add_signer`** (and likely `remove_signer` / `update_threshold`) on
an Arbitrum account reverts on-chain with `WalletError("Tx failed")`. All other
wallet management actions are working:

| Action | Arbitrum Sepolia |
|--------|------------------|
| Create account | ✅ |
| Receive / send ETH, USDC | ✅ |
| Transfer via `execute()` | ✅ |
| Batch transfer via `execute()` | ✅ |
| Add / remove signer, update threshold | ❌ (open issue) |

Use Horizen or Base for accounts that need to change their signer set. See
`packages/stylus/NOTES.md` for the technical write-up and current debugging
leads.

### MetaMask "transaction may fail" warning when sending ETH

MetaMask's Blockaid security checker does not understand Stylus WASM
bytecode and may refuse to broadcast plain ETH transfers to a Stylus-backed
account, even though the on-chain call succeeds. Workaround: disable
"Transaction security alerts" in MetaMask settings, or use Rabby / `cast send`.

## How it works under the hood

The Stylus impl is ~31 KB compressed, above the EVM 24 KB code-size limit, so
`cargo-stylus` fragments it across two contracts on-chain. That makes the
single-bytecode `StylusDeployer.deploy(bytecode, ...)` path unusable for
per-account creation. Instead the architecture splits into three pieces per
chain:

```
   Stylus impl (deployed once, ~31 KB WASM)
   - holds the contract logic
   - its own storage is unused
        ▲
        │ delegatecall on every call
        │
   Per-account proxy (~52 bytes EVM bytecode)
   - one per PolyPay account
   - holds the live storage (signers, nonces, nullifiers)
        ▲
        │ created by
        │
   Factory (deployed once)
   - createWallet(...) clones a new proxy + calls init() on it
   - factory's `implementation` address is immutable
```

Each proxy is a thin custom variant of EIP-1167:

- `calldatasize == 0` → `STOP` (accept plain ETH transfers; required because
  the fragmented Stylus loader reverts on empty calldata, which would
  otherwise break `addr.transfer(...)` deposits).
- Otherwise → delegatecall to the impl, same as standard EIP-1167.

`execute()` in the impl detects when `to == address(this)` (i.e., a self-call
to `add_signer` / `remove_signer` / `update_threshold` / `batch_transfer*`)
and dispatches to internal Rust helpers directly instead of going through an
EVM `CALL`. This workaround is what makes `batch_transfer` succeed on
Arbitrum despite the suspected Stylus delegatecall + CALL `msg.sender` bug;
`add_signer` still fails through the same path and the root cause is open
(see `packages/stylus/NOTES.md`).

### On-chain addresses (Arbitrum Sepolia, chain 421614)

| Component | Address |
|-----------|---------|
| PoseidonT3 (deterministic) | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` |
| zkVerify aggregation (proxy) | `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2` |
| Circle USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Stylus impl | `0x0395b99f3a45bd08d018d3d3060a0e2bf8dc8978` |
| Stylus factory | `0x8F5f249210fFc91a2b1D86828764562f97C9eEdd` |

The impl + factory addresses live in `packages/shared/src/contracts/contracts-config.ts`
(`stylusImplAddress` / `stylusFactoryAddress`); bump them there after a
re-deploy.

## For developers who need to redeploy

If you change `packages/stylus/src/lib.rs` you must redeploy both the impl
(via cargo-stylus) and the factory (it captures the impl address as an
immutable). Then bump the addresses in `contracts-config.ts`.

See `packages/stylus/README.md` for the full step-by-step build + deploy
guide. No env vars are required on the backend; the factory address is
sourced from `@polypay/shared`.
