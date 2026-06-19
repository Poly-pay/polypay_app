# Orochi Network Exploration

**Goal:** find an Orochi Network product PolyPay can integrate with actual code (so Orochi's
name can be listed in-app). Co-marketing without code is out of scope. A mainnet integration
is preferred.

**Method:** every claim below is sourced. Deployment facts verified against Orochi's docs
source repo and contract repo (June 2026). Items marked *(unverified)* still need a check.

## Orochi products

Verifiable-data vendor; a suite, not one product. Source:
[Gate Learn](https://www.gate.com/learn/articles/what-is-orochi-network-all-you-need-to-know-about-on/8732).

- **Orand** — verifiable randomness (ECVRF).
- **Orocle** — price/data oracle.
- **zkDatabase** — off-chain DB with ZK prover (built on Mina / o1js).
- **Orosign** — gasless multisig wallet.
- **ONProver** — browser prover node + airdrop campaign (nothing to integrate).

## Chain alignment

PolyPay runs on Horizen (primary), Base, Arbitrum.

| PolyPay chain | Orochi mainnet | Source |
|---|---|---|
| **Base** (8453) | ✅ Orand V3 + Orocle V2 | [orand-v3.md](https://github.com/orochi-network/orochi-network.github.io/blob/main/src/orochi-network/orand-v3.md), [orocle-v2.md](https://github.com/orochi-network/orochi-network.github.io/blob/main/src/orochi-network/orocle-v2.md) |
| **Arbitrum** (42161) | ❌ Arbitrum Sepolia testnet only | same docs |
| **Horizen** (primary) | ❌ not listed | same docs |

Mainnet integration is only possible on **Base**. PolyPay's primary chain (Horizen) has no
Orochi deployment, so nothing here can replace a core component — only add a Base-scoped feature.

### Verified Base mainnet addresses

| Contract | Base mainnet | Source |
|---|---|---|
| Orocle V2 | `0x1Df0848aB779b1978392A6383487232BfB424b27` | [orocle-v2.md](https://github.com/orochi-network/orochi-network.github.io/blob/main/src/orochi-network/orocle-v2.md) |
| Orand V3 | `0xa56013BDCC663B63C12f5ebddd0C754bF4fEf096` | [orand-v3.md](https://github.com/orochi-network/orochi-network.github.io/blob/main/src/orochi-network/orand-v3.md) |

## Product-by-product verdict

| Product | Status | Verdict for PolyPay |
|---|---|---|
| Orocle V2 | Live on ~18 mainnets incl. Base | Redundant — see below |
| Orand V3 | Live on ~20 mainnets incl. Base | No real use case — see below |
| zkDatabase | npm `zkdb` v3.0.0; **mainnet live (Feb 2026) but invite-only** | Only on-brand option; mainnet gated by whitelist — see below |
| Orosign | BNB testnet only ([README](https://github.com/orochi-network/smart-contracts)) | Competes with PolyPay's own multisig |
| ONProver | Campaign, not a product | N/A |

### Orocle V2 — redundant

PolyPay already fetches USD prices from CoinGecko:
- Backend `packages/backend/src/price/price.service.ts` (CoinGecko `/simple/price`, cache + retry + stale fallback).
- Tokens ETH / ZEN / USDC, `packages/shared/src/constants/token.ts`.
- UI: sidebar balance, `PortFolioModal.tsx`, `TokenPillPopover.tsx`.

Orocle returns the same number. Read interface `IOrocleAggregatorV2`
([source](https://github.com/orochi-network/smart-contracts/blob/main/contracts/orocle-v2/interfaces/IOrocleAggregatorV2.sol)):
`getLatestData(uint32 appId, bytes20 identifier) view returns (bytes32)` (appId 1 = asset
price, 18 decimals). Readable directly via viem — no contract deploy.

Blockers:
1. Functionally duplicates CoinGecko.
2. Base only; CoinGecko covers all chains.
3. Orocle on Base almost certainly does **not** feed **ZEN** (PolyPay's signing token, native
   to Horizen): Orochi publishes no asset list, docs mention only BTC/ETH/USDT, and ZEN/Horizen
   appear nowhere. Feeds are provisioned on request (the interface exposes `request()` /
   `fulfill()`), so ZEN coverage is a "must ask Orochi to add it" item, not a static fact.

### Orand V3 — no use case

ECVRF randomness. Consumer must implement `consumeRandomness(uint256)`
([source](https://github.com/orochi-network/smart-contracts/blob/main/contracts/orand-v2/interfaces/IOrandConsumerV2.sol)).
Requires a deployed consumer contract + publish/epoch flow + registering a username/secret
with Orochi. PolyPay has no feature that needs randomness (quest/leaderboard were removed;
their rewards were rank-based). Note: the legacy `@orochi-network/sdk` GitHub repo is
**archived** ([repo](https://github.com/orochi-network/sdk)), though npm still shows v2.2.1.

### zkDatabase — only on-brand fit; mainnet exists but is invite-only

Off-chain DB (MongoDB) with ZK integrity proofs. Sources: SDK examples in
[zkDatabase repo](https://github.com/orochi-network/zkDatabase/tree/main/examples/src),
docs [docs.orochi.network/zkDatabase](https://docs.orochi.network/zkDatabase/database/database-create/).

Verified facts:
- npm `zkdb` v3.0.0 (registry.npmjs.org) — usable from the NestJS backend.
- Schema uses o1js circuit types (`CircuitString`, `UInt32`); proofs are o1js/Kimchi, verified
  via o1js `verify()` → Mina-based (blog claims multi-chain compatibility, but the SDK is o1js).
- **Mainnet IS live:** Orochi blog "zkDatabase Mainnet is now live" (2026-02-02,
  [source](https://orochi.network/blog/where-orochi-is-now-looking-towards-2026)); production
  console at `app.zkdatabase.org` / `dashboard.orochi.network` with public pricing.
- **But production access is whitelist / invite-only.** The console shows: *"Production access
  is currently limited to whitelisted users. To access the product, you'll need an invite code.
  Please contact us to get your invite code link and log in."* — buttons "Request Invite Code" /
  "Try Testnet". This is why no production endpoint is publicly reachable.
- All **public** endpoints are testnet: repo `examples/src/connection.ts` →
  `test-serverless.zkdatabase.org/graphql`; docs connect snippet → `serverless.zkdatabase.org/graphql`
  explicitly annotated *"This URL is for test environment"*. The mainnet endpoint + credentials are
  issued per-account after invite-gated login, not published.
- Auth requires a **Mina private key** (mina-signer / Auro Wallet).
- Data is stored on Orochi's hosted MongoDB.

Possible feature: a **verifiable payroll audit trail** — write each approved batch as a
zkDatabase document, generate a ZK integrity proof, show an "integrity verified by Orochi
zkDatabase" badge. This is real code and on-brand with PolyPay's privacy pitch.

Blockers:
1. Mainnet is **invite-only** → must request an invite code from Orochi before any production
   integration (this is also the natural partnership touchpoint for listing their name).
2. Mina-based o1js stack — adds a **second ZK stack** alongside PolyPay's Noir/UltraHonk.
3. Sends payroll data to **Orochi-hosted MongoDB** — privacy/compliance concern for a payroll app.

## Conclusion

Hard requirements are (a) real code in PolyPay and (b) mainnet. No product satisfies both cleanly:

| Option | Code | Mainnet | Trade-off |
|---|---|---|---|
| Orocle V2 on Base | ✅ | ✅ public | Duplicates CoinGecko; ZEN coverage unverified |
| zkDatabase audit trail | ✅ | ⚠️ live but invite-only | On-brand; needs Orochi invite + Mina stack + data on Orochi's server |

Decision required: keep an immediately usable mainnet → Orocle on Base (accept redundancy); or
prioritise an on-brand feature → zkDatabase audit trail (request an Orochi invite code first,
accept the Mina stack). The zkDatabase path requires a partnership contact anyway, which doubles
as the reason to list Orochi's name.

Rejected: Orosign (competitor), ONProver (not a product), co-marketing-only (needs no code,
out of scope).

## To confirm with Orochi (not externally verifiable)

1. Can Orocle V2 on Base feed **ZEN** and the exact tokens PolyPay pays in? Feeds are
   provisioned on request, so this is a partnership ask, not a published fact.
2. zkDatabase mainnet **invite code** — production access is whitelisted; the mainnet endpoint
   and credentials are only issued after Orochi grants an invite (`app.zkdatabase.org`).
