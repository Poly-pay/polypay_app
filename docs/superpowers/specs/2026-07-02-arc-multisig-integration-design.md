# Arc Multisig Integration — Design

**Status:** approved design, pending implementation plan.
**Date:** 2026-07-02.

## Goal

Let a user, on the PolyPay staging app, create a **non-private multisig on Circle's Arc testnet**
and run a single USDC transfer through it (propose → approve → execute), fully in the existing UI.
Arc has no zkVerify, so this path drops privacy: signers are plain addresses verified with ECDSA.
This is a staging demo, not production.

## Scope

In scope:
- Create an Arc multisig (owner addresses + threshold).
- One USDC transfer end to end: propose, approve to threshold, execute.
- Arc accounts persist and appear in the existing dashboard (badged "non-private").

Out of scope (this iteration): batch transfers, add/remove signers, threshold changes, notifications
parity. The demo contract already supports batch on-chain, but no UI/backend wiring for it now.

## Approach: parallel Arc module (Approach B)

Add a self-contained Arc path alongside the ZK stack. **The existing ZK controllers, services, and
hooks are not modified** — the only shared surfaces are the Prisma schema (additive migration), the
dashboard account list (union of both sources), and chain/config. This isolates the working ZK
product on staging from regressions.

Chain routing key: a chain is `ecdsa` when it has no zkVerify config (Arc), else `zk`. Arc testnet
is chainId `5042002`.

## Already done (this branch)

- `packages/hardhat/contracts/MetaMultiSigWalletArc.sol` — ECDSA multisig, same transfer/batch
  surface as the ZK wallet. Deployed + smoke-tested live on Arc testnet
  (`0x41D925843a192F859cf14aba4789744b1e58eB15`).
- `arcTestnet` network in `hardhat.config.ts`; `scripts/deployArc.ts`, `scripts/testArc.ts`.

## Key fact: USDC is the native token on Arc

On Arc, USDC IS the native gas token (18 decimals). Sending USDC = a **native value transfer**, not
an ERC20 call. So an Arc transfer is `execute(to, amount, "0x", signatures)` — no ERC20 `transfer`
encoding. This differs from PolyPay's other chains, where USDC is an ERC20.

## Data model (Prisma, additive — one migration)

- `Account`: add `chainType String @default("zk")` (`"zk"` | `"ecdsa"`).
- `AccountSigner`: add `address String?` (Arc owner address). ZK rows keep `commitment`.
- `User`: add `address String? @unique`; make `commitment` nullable. An Arc user is an address row.
- Transaction vote model: add `signature String?`. ZK votes keep their proof/nullifier fields.

All new columns are nullable or defaulted, so existing ZK rows are unaffected. Uniqueness for Arc
users is enforced on `address`; commitment uniqueness stays for ZK users.

## Backend: `arc/` module

New module; existing `auth`, `account`, `transaction` modules untouched.

- **`arc-auth`** — SIWE (EIP-4361) login. `GET /arc/auth/nonce` issues a nonce; `POST /arc/auth/login`
  verifies the signed message, upserts the `User` by address, and issues a JWT with `sub = address`
  and a `chainType: "ecdsa"` claim. A separate `ArcAuthGuard`/JWT strategy validates these tokens so
  the existing `JwtStrategy` (commitment-based) is not touched.
- **`arc-account`** — `POST /arc/accounts` with `{ owners: address[], threshold, chainId }`. Calls the
  relayer to deploy `MetaMultiSigWalletArc`, then persists `Account(chainType="ecdsa")`,
  `AccountSigner(address)` rows, and owner `User(address)` rows.
- **`arc-transaction`**:
  - `POST /arc/transactions` — propose: create the transaction + store the proposer's signature.
  - `POST /arc/transactions/:id/approve` — add a signature.
  - `POST /arc/transactions/:id/execute` — when collected signatures ≥ threshold, submit on-chain.
  - Signature check: recover the signer from `getTransactionHash(nonce, to, value, data)` (EIP-191
    personal message), require it to be a current owner, dedupe by recovered address.

## On-chain submit: relayer

The relayer (`relayer-wallet.service.ts`) submits both deploy and execute for Arc, matching the ZK
UX where users never touch the chain directly:

- Add `deployArcAccount(owners, threshold, chainId)` → deploys `MetaMultiSigWalletArc` (constructor
  `[chainId, owners, threshold]`).
- Add `executeArcTransaction(walletAddress, to, value, data, signatures[])` → calls
  `execute(to, value, data, signatures)` with signatures sorted ascending by recovered address.

**Ops note:** the relayer wallet must hold **Arc testnet USDC** (the native gas token) to pay gas on
Arc. Fund it from `https://faucet.circle.com`. viem pays gas from the native balance, so no ETH is
needed; only the display/pricing assumptions elsewhere assume ETH, and those are not on this path.

## Shared package (`@polypay/shared`)

- Add `MetaMultiSigWalletArc` ABI + bytecode (alongside the existing `METAMULTISIG_ABI`) for the
  relayer deploy.
- Register Arc testnet (chainId 5042002) in the chains config as an `ecdsa` chain (no zkVerify addr).

## Frontend (parallel Arc flow)

- Add Arc testnet to `scaffold.config.ts` `targetNetworks` (testnet set). Native currency is USDC.
- **SIWE login hook** for Arc (sign message → `/arc/auth`).
- **Create-multisig page** for Arc: connect wallet, enter owner addresses + threshold, call
  `/arc/accounts`.
- **Transfer flow** for Arc: propose (sign the tx hash → `/arc/transactions`), approve (other owners
  sign), execute (relayer submits once threshold met).
- **Dashboard**: union ZK accounts + Arc accounts; Arc accounts show a "non-private / signers public"
  badge.

The Arc hooks/pages are separate from the ZK identity/proof hooks (`useAuthProof`,
`useGenerateProof`, `useIdentityStore`); they use wallet signatures, not Poseidon commitments.

## Error handling

- Invalid SIWE signature → 401.
- Recovered signer not an owner, or duplicate signer → reject the vote.
- Execute called below threshold → 4xx, no on-chain call.
- Relayer out of Arc USDC → surface a clear "relayer unfunded" error.
- Reuse `formatErrorMessage` / `notification` for user-facing messages.

## Testing

- Contract: already smoke-tested live on Arc testnet.
- Backend unit tests: `arc-account` (deploy + persist), `arc-transaction` (signature recovery,
  threshold gating, execute), `arc-auth` (SIWE verify).
- Manual staging E2E: create an Arc multisig → propose → approve to threshold → execute a native
  USDC transfer; confirm on `testnet.arcscan.app`.

## Isolation summary

- No changes to ZK auth, account, transaction, or proof code paths.
- Shared, additive-only changes: Prisma migration, dashboard union query, chain/config, relayer
  gains two Arc-specific methods.
