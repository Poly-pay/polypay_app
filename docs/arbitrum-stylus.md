# Arbitrum Stylus Support

## Overview

PolyPay supports **Arbitrum Sepolia** (chain ID 421614) as a destination chain
for multisig accounts, in addition to Horizen and Base. Most flows (create
account, deposit / send ETH and USDC, propose / approve / execute transfers
and batch transfers) work the same as on the other chains; **add / remove
signer and update-threshold are currently broken on Arbitrum only** — see the
[caveat below](#add--remove-signer-is-currently-broken).

The only structural difference vs. Horizen / Base is that **both** the account
contract **and** the factory that deploys per-account proxies are Rust/WASM
contracts running on [Arbitrum Stylus](https://arbitrum.io/stylus) instead of
Solidity. Per-account wallets themselves are tiny 62-byte EVM proxies (EIP-1167
variant) that delegatecall into the shared Stylus impl.

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

### Aggregation cadence

zkVerify now publishes aggregation receipts to Arbitrum Sepolia in **≈2
minutes** ([kurier docs][zkv-cadence]), on par with Horizen Testnet, so a
freshly-submitted transaction becomes executable shortly after it is approved.

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
   Factory (deployed once, also Rust/Stylus)
   - createWallet(...) clones a new proxy + calls init() on it
   - factory's `implementation` address is immutable
   - source: packages/stylus-factory
```

The factory was originally written in Solidity (`packages/hardhat/contracts/MetaMultiSigWalletStylusFactory.sol`,
still in the tree as a reference) and later ported to Rust/Stylus
(`packages/stylus-factory/`). Both emit byte-identical proxy bytecode — a unit
test in `packages/stylus-factory/src/lib.rs` guards against drift — so accounts
created against either factory are indistinguishable on-chain. The Rust
version is the one wired into `contracts-config.ts`.

**Note on Poseidon**: the Stylus impl still STATICCALLs the on-chain
`poseidon-solidity` PoseidonT3 library for ZK proof verification. Porting
Poseidon into the Stylus contract is not feasible without breaking
compatibility with the Noir circuit — the only Stylus-native Poseidon
library (OpenZeppelin's) implements Poseidon2, a different algorithm. See
`packages/stylus/NOTES.md` for the survey.

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
| Stylus impl (Rust/WASM) | `0x0395b99f3a45bd08d018d3d3060a0e2bf8dc8978` |
| Stylus factory (Rust/WASM) | `0xc35c0693286ebdc18bdf257f102dec9632a7ce77` |

The impl + factory addresses live in `packages/shared/src/contracts/contracts-config.ts`
(`stylusImplAddress` / `stylusFactoryAddress`); bump them there after a
re-deploy.

## For developers who need to redeploy

If you change `packages/stylus/src/lib.rs` (the impl) you must redeploy
both the impl and the factory (the factory captures the impl address as an
immutable). If you only change `packages/stylus-factory/src/lib.rs`, just
redeploy the factory.

Both build with `cargo stylus deploy`. See `packages/stylus/README.md` for
the full step-by-step build + deploy guide. After deploying, update
`stylusImplAddress` / `stylusFactoryAddress` in
`packages/shared/src/contracts/contracts-config.ts`. No env vars are
required on the backend.
