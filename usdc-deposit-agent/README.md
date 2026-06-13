# PolyPay USDC Deposit Agent — Arbitrum One (OWS-secured)

An autonomous agent that funds an **already-created PolyPay multisig** with USDC on
**Arbitrum One**, gaslessly, via PolyPay's **x402** deposit flow — while keeping the
signing key out of the agent process entirely.

```
agent process  ──spawn──▶  OWS signer subprocess  ──▶  OWS policy engine  ──▶  vault key
(holds token)              (holds token)               (allow/deny)            (~/.ows, encrypted)
       │                                                                            │
       └────────── builds x402 payload, POSTs to PolyPay ◀── signature ────────────┘
```

## Why this design

- **Not Coinbase `awal` / agentic wallet** — it only supports Base/Polygon/Solana, **not Arbitrum**.
- **Not a raw `PRIVATE_KEY` in `.env`** — that key would sit in the agent's heap, reachable by any
  tool it runs and one prompt-injection away from signing an attacker's transfer.
- **OWS ([Open Wallet Standard](https://github.com/open-wallet-standard/core))** — key encrypted at
  rest (AES-256-GCM / scrypt), the agent holds only a **scoped token**, and a **policy engine**
  decides what may be signed *before* the key is ever decrypted.

### What the policy guarantees

Even if this agent is fully compromised or prompt-injected, the scoped token can **only** produce:

- an **EIP-3009 `TransferWithAuthorization`** (not arbitrary transactions),
- for **USDC** (`0xaf88…5831`) — no other token,
- on **Arbitrum One** (`eip155:42161`) — no other chain,
- to **your multisig** — no other recipient,
- **≤ your cap** per signature, until the token **expires**.

It cannot drain the wallet or redirect funds. (`policy/check-deposit.mjs` enforces this; chain +
expiry are also enforced declaratively by OWS.)

## Prerequisites

- Node.js ≥ 20.18.3
- The OWS CLI: `curl -fsSL https://docs.openwallet.sh/install.sh | bash`
- An EOA **funded with USDC on Arbitrum One** (the facilitator sponsors gas; the agent spends USDC).
- The target PolyPay multisig address (must be an **Arbitrum One** multisig).

## Setup

```bash
cd usdc-deposit-agent
npm install        # or: yarn
```

### 1. Import your funded key into the OWS vault (one time)

> ⚠️ Run this yourself in your terminal. **Never paste the private key into a chat or commit it.**
> It is read from stdin and encrypted into `~/.ows` — it never enters this project or the agent.

```bash
# you will paste the key at the prompt
ows wallet import --name agent-treasury --private-key
# (or import a mnemonic: ows wallet import --name agent-treasury --mnemonic)
```

Confirm the imported address: `ows wallet list`.

### 2. Render the policy + mint the scoped token

```bash
MULTISIG_ADDRESS=0xYourArbitrumMultisig MAX_USDC=100 EXPIRES_DAYS=30 ./setup.sh
```

This renders the policy for *your* multisig and cap, registers it, and prints a one-time
`ows_key_...` token.

### 3. Configure `.env`

```bash
cp .env.example .env
# set OWS_API_KEY (the ows_key_... token), OWS_WALLET, MULTISIG_ADDRESS, AMOUNT_USDC
```

## Verify the policy (no funds, no setup)

```bash
npm run test:policy
```

Spins up an isolated temp vault and proves the gate: a correct deposit signs, while a wrong
recipient, an over-cap amount, and the wrong chain are all denied.

## Run

```bash
npm run deposit        # or: yarn deposit
```

Output:

```
→ PolyPay USDC deposit agent (Arbitrum One, gasless x402)
  agent wallet : 0x…
  multisig     : 0x…
  amount       : 1 USDC (1000000 base units)
  signing      : via OWS vault (policy-gated)…
  submitting   : POST x402 deposit…
✓ Deposit settled
  tx hash      : 0x…
```

## How it works (flow)

1. **Discover** — `GET /api/x402/deposit/:multisig` returns `402` with the payment requirements
   (asset, `payTo`, network `arbitrum`, min/max, EIP-712 domain).
2. **Build** — assembles the EIP-3009 `TransferWithAuthorization` typed data (byte-compatible with
   PolyPay's frontend `eip3009.ts`).
3. **Sign** — spawns `signer/ows-signer.mjs`, which calls OWS `signTypedData`. The policy engine
   evaluates the typed data; only then is the key decrypted, used, and wiped. The agent's main
   process never imports the OWS SDK and never sees the key.
4. **Submit** — base64-encodes the x402 v1 payload, `POST`s it with the `X-PAYMENT` header. PolyPay
   settles via the Coinbase CDP facilitator (gasless). Returns `principalTxHash`.

## Operations

- **Rotate / revoke** the agent: `ows key revoke --id <key-id> --confirm` (find it via `ows key list`).
  The token instantly becomes useless; the wallet is untouched.
- **Change the cap or expiry**: re-run `setup.sh` with new values, then mint a fresh token.
- **Audit**: every signing request is logged to `~/.ows/logs/audit.jsonl`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `OWS signer exited … POLICY_DENIED` | The request violated the policy (wrong recipient/amount/chain/expired). Check the deny reason. |
| `Expected HTTP 402 … got 4xx` | Wrong multisig address, or it isn't an Arbitrum One x402 multisig. |
| `Insufficient USDC` | Fund the agent EOA with USDC on Arbitrum One. |
| `Signature check failed` | Domain name/version mismatch — set `ARBITRUM_RPC_URL` so the agent reads them on-chain. |

## Hardening (optional, Layer 2)

This is Layer 1 (single host, key isolated behind a subprocess + policy). To fully isolate the
signer, run OWS in its own container exposing signing over a local socket, with the agent in a
separate container holding only `OWS_API_KEY` — the "two containers, one socket" KMS pattern.
