# Qash EVM — Technical Plan

**Goal (Phase 1):** End-to-end batch bill payment on Base, using Qash's UI and business logic, with PolyPay's zkVerify signer-privacy core replacing Miden.

---

## 1. Decision

**Fork the Qash monorepo. Replace the Miden chain layer with PolyPay's EVM chain layer.**

Not the other way round. Qash's backend already contains every business model we need (Company, TeamMember, Employee, Invoice, Bill, Payroll, Proposal, Notification, ActivityLog, cron, email, PDF). PolyPay's backend has none of them. Porting Qash's UI into PolyPay would mean rebuilding ~300 components and ~14 data models; porting PolyPay's chain layer into Qash means adding 3 backend modules.

Both are NestJS 11 + Prisma 7 + PostgreSQL, so the transplant is mechanical, not architectural.

---

## 2. Target architecture

```
Qash UI (Next 15)                    ← from qash-product (newest design)
   │  Para login (email/Google)
   │  Passkey PRF → unwrap ZK secret
   │  Noir proof generation (browser)
   ▼
qash-server (NestJS)                 ← Qash business logic + PolyPay chain layer
   │  Company / Invoice / Bill / Proposal / Signature
   │  zkverify module   → Kurier API → zkVerify aggregation
   │  relayer-wallet    → hot EOA, pays all gas
   ▼
MetaMultiSigWallet (Base)            ← from PolyPay, unchanged except circuit binding
   execute(nonce, to, value, data, ZkProof[])
     └─ batchTransferMulti(recipients[], amounts[], tokens[])
```

**Removed entirely:** Miden SDK, Guardian/PSM, note lifecycle (send/consume/recall/timelock), client-side ZK proving of transactions, the two-Miden-client setup, the proposal reconciler, `/legacy/*`.

Guardian exists only because Miden multisig state is private and off-chain, so cosigners have no shared source of truth. On EVM the chain *is* the source of truth, and qash-server already coordinates proposals and signatures. Guardian's EVM client (`@openzeppelin/guardian-evm-client`) additionally requires ERC-4337 and snapshots **public EOA signers** — which would destroy the signer privacy that is the whole point of keeping zkVerify.

---

## 3. Privacy model

| | Hidden from chain? |
|---|---|
| Signer identity | **Yes** — Poseidon commitments + nullifiers; only the relayer EOA ever appears on-chain |
| Recipient | No |
| Amount | No |

This is what PolyPay ships today. Confidential amounts require FHE (Zama / Inco), which means a different chain — out of scope, roadmap only.

---

## 4. Identity & auth

Three separate layers:

| Layer | Mechanism |
|---|---|
| Session | Para JWT (email / Google, MPC embedded wallet) — kept from Qash |
| Secret custody | **Passkey (WebAuthn PRF)** — new |
| Transaction approval | Noir proof: knowledge of `secret` **and** control of the Para key |

### Why passkey

PolyPay derives `secret = keccak256(sign("noir-identity"))`. Para is a 2-of-2 MPC wallet: no party holds the full private key, so RFC 6979 deterministic nonces are mathematically impossible and every signature differs. That derivation cannot work.

Instead: `secret` is random, wrapped under a key derived from the passkey's PRF output, ciphertext stored server-side. The backend never sees the plaintext. PRF is supported in Chrome/Edge, Safari 18+, Firefox 148+, and follows the user across devices via iCloud Keychain / Google Password Manager.

Recovery, in order: synced passkey → optional recovery-password wrap → signer rotation (`removeSigners` + `addSigners`, already in the contract).

### Circuit change — make the second factor real

Today's transaction circuit takes `pub_key_x`, `pub_key_y`, and `signature` as **private** inputs and never binds them to `secret` or `commitment`. The contract stores only `uint256[] commitments` — no public keys. A prover holding `secret` can generate a throwaway keypair, sign with it, and pass. The ECDSA constraint costs most of the proving time and secures nothing.

Fix — bind the commitment to the key:

```noir
// transaction circuit
assert(ecdsa_verify(pub_key_x, pub_key_y, signature, eth_signed_hash));
assert(commitment == poseidon2(secret, hash(pub_key_x, pub_key_y)));   // changed
assert(nullifier  == poseidon2(secret, tx_hash_field));

// auth circuit (registration only)
fn main(secret: Field, pub_key_hash: pub Field, commitment: pub Field) {
    assert(poseidon2(secret, pub_key_hash) == commitment);
}
```

Now forging requires **both** the secret and the Para key. Free to do — Qash EVM deploys fresh contracts on Base, so there is no VK migration.

Also: take the public key from Para's JWT rather than `recoverPublicKey(signature)`. Para's MPC signatures are reported to have an unreliable `v` byte; recovery would break. Noir's `verify_signature` only needs `r||s`, so `v` becomes irrelevant.

### Flows

**Onboarding**
1. Para login → backend verifies JWKS → `users` row → `para-jwt` cookie
2. Register ZK identity: passkey create+get → PRF → `secret` (random) → `commitment = poseidon2(secret, hash(paraPubKey))` → auth proof
3. `POST /auth/register-identity` — backend verifies the proof via zkVerify **and** checks the proof's public `pub_key_hash` equals the Para-attested public key, then stores `users.commitment` + the wrapped secret

**Login, same device:** Para JWT; `secret` already in localStorage. No passkey prompt, no proving.

**Login, new device:** Para JWT → fetch wrapped blob → passkey (Face ID) → PRF → decrypt.

**Approve:** Para signs `txHash` → Noir tx proof → `POST /multisig/proposals/:id/signatures` → backend submits to zkVerify, polls to `Aggregated`, stores the Merkle proof. At threshold, proposal → `READY`.

**Execute:** relayer calls `execute(nonce, to, value, data, proofs[])`.

---

## 5. Schema changes

Everything in Qash's business layer (Company, TeamMember, Employee, Invoice, Bill, Payroll, PaymentLink, Notification, ActivityLog) stays **unchanged**. Only the multisig tables move from Miden to EVM.

```diff
model MultisigAccount
- accountId  String       // Miden bech32
+ address    String       // EVM
+ chainId    Int
  publicKeys String[]     // unchanged — already stores commitments, not public keys
  threshold  Int

model MultisigProposal
- summaryCommitment, summaryBytesHex, requestBytesHex, psmProposalId, noteIds[]
+ nonce  Int
+ to     String
+ value  String
+ data   String
+ txHash String?
  metadata Json           // unchanged — still holds payments[] for the batch
  status   enum           // unchanged — PENDING → READY → EXECUTED

model MultisigSignature
- approverIndex, approverPublicKey, signatureHex
+ voterCommitment, nullifier
+ jobId, proofStatus, aggregationId, domainId, merkleProof[], leafCount, leafIndex

+ model UserSecretBackup   // new
+   userId, credentialId, ciphertext, salt, nonce, kdfParams

- enum MultisigProposalTypeEnum.CONSUME   // no notes on EVM
```

Account creation inverts: today the browser deploys on Miden and the backend trusts whatever `accountId` it is handed. On EVM the **backend relayer deploys** `MetaMultiSigWallet(commitments[], threshold)` and records the address.

---

## 6. Scope — Phase 1

**Target: 3 weeks. Base Sepolia.**

**In:** Employee → Invoice → Bill → select bills → batch proposal → threshold signing → execute → `PAID`.

This is Qash's real batch flow. A `Bill` is a 1:1 satellite of an `Invoice` and cannot exist without one, so the invoice layer is not optional.

Identity: Para login + passkey-backed secret custody + the commitment-bound transaction circuit. All in.

**Deferred to Phase 2** (code exists in Qash and is switched off, not deleted):
- Base mainnet deployment
- Payroll cron / recurring invoice generation
- Passkey extras: multi-credential wrapping, a second recovery-password wrap, credential management and revocation. Phase 1 ships one credential per user, which covers the normal case (passkeys sync via iCloud Keychain / Google Password Manager)
- Payment links, B2B invoice schedules, corporate card, reimbursement, ramp, earn
- Realtime socket notifications (broken upstream — the client emits `join_wallet`, the gateway only handles `join_user`; REST polling works)

Phase 2 is mostly re-enabling what Qash already built, once the chain layer underneath is proven.

---

## 7. Workstreams & effort

Single engineer, focused. Estimates include integration and testing, not just coding.

Most of this work is **transplant, not construction**. Measured volumes: ~1,540 LOC of PolyPay backend modules copied nearly verbatim; ~2,790 LOC of Miden frontend code deleted; 47 files touching the Miden SDK, most of them a one-line import change. The two genuinely heavy files are `services/api/multisig.ts` (1,324 LOC, rewritten) and `multisig.service.ts` (1,740 LOC, of which roughly 70% is chain-agnostic business logic that stays).

| # | Workstream | Days |
|---|---|---|
| 1 | Delete the Miden layer (SDK, PSM/Guardian, note utils, 2-client setup, reconciler, `/legacy/*`); fix imports across 47 files | 1.5 |
| 2 | Rewrite `services/api/multisig.ts` — strip PSM/Miden calls, replace with REST + proof generation | 2 |
| 3 | Wire wagmi/viem + `@getpara/viem-v2-integration`; port `useGenerateProof` | 1 |
| 4 | Circuit changes (commitment binding); recompile; deploy `MetaMultiSigWallet` on Base Sepolia; register VK | 2 |
| 5 | Copy `zkverify`, `relayer-wallet`, `transaction-executor` from PolyPay into qash-server | 2 |
| 6 | Rewrite the chain-facing parts of `multisig.service.ts` (create account via relayer; proposal → EVM calldata; signature → zkVerify proof; mark-executed) | 2 |
| 7 | Prisma migration: three multisig tables + `UserSecretBackup` | 0.5 |
| 8 | Passkey PRF (WebAuthn create/get, HKDF, AES-GCM wrap/unwrap, restore) + `POST /auth/register-identity` | 2.5 |
| 9 | **E2E batch run on Base Sepolia**; measure gas and zkVerify aggregation latency; tune the recipient cap | 3 |
| 10 | Hide out-of-scope routes; disable payroll cron | 0.5 |

**Central estimate: 17 working days. Target: 3 weeks (15 working days).**

The 3-week target is achievable but carries no slack. It holds only if the deferrals in §6 hold and the first end-to-end integration of zkVerify + relayer + a freshly deployed contract goes cleanly. WS9 is the item most likely to overrun; it is where the buffer would have to come from, and there is none. If WS9 doubles, the plan lands at 4 weeks.

---

## 8. Risks

| Risk | Impact | Handling |
|---|---|---|
| **zkVerify aggregation latency** | Each approval must reach `Aggregated` before execution. Signing a batch is slower than Miden. | Measure in WS7 and report a real number. Proofs aggregate while other signers are still reviewing, so wall-clock cost is partly hidden. |
| Gas for 50 recipients on Base | Est. 2.5–3M gas (50 ERC20 transfers + N proof verifications). | Measure; lower the cap if needed. Qash already caps at 50. |
| Passkey PRF edge cases | PRF on `create()` is not universally returned; iOS Safari does not pass PRF to roaming authenticators. | Call `get()` immediately after `create()`; platform authenticators only. |
| Qash UI is tightly coupled to Miden | Chain code is scattered across contexts and hooks, not isolated behind an interface. | WS1 exists precisely for this and is sized for it. |

Resolved during investigation, no longer risks: zkVerify is deployed on Base mainnet and Sepolia (addresses already in config); the contract already has `batchTransferMulti`; UltraHonk shipped in PolyPay PR #248; Para exposes a standard viem `WalletClient`.

---

## 9. Reused as-is

| From PolyPay | |
|---|---|
| `MetaMultiSigWallet.sol` | Only the circuit binding changes; `batchTransferMulti` already does exactly what Qash's batch proposal needs |
| `zkverify` module | Kurier submission, VK registration, aggregation polling |
| `relayer-wallet` module | Account deployment, `execute`, gas |
| `transaction-executor` | `buildExecuteParams`, nonce reservation, reconciler cron |
| Noir circuits | With the commitment-binding fix |

| From Qash | |
|---|---|
| Entire business layer | Company, TeamMember, Employee, Invoice, Bill, Payroll, PaymentLink, Notification, ActivityLog, cron, email, PDF |
| Entire UI | Per `namq3labs/qash-product`, the newest design |
| Para auth | JWKS strategy, `para-jwt` cookie, `users` table |
