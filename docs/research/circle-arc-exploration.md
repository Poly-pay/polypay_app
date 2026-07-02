# Circle Integration & Arc Deployment — PolyPay Assessment

**Goal:** decide whether PolyPay can (a) deploy on Circle's **Arc** L1 and (b) integrate any Circle
product with real code. Exploration only, not production.

## 1. Can PolyPay deploy on Arc?

`MetaMultiSigWallet.sol` uses only standard EVM opcodes, so the contract itself is portable to any
EVM chain. But the **private** app cannot run on Arc, and Arc has no production target yet:

| Blocker | Detail | Source |
|---|---|---|
| **zkVerify not on Arc** | PolyPay verifies every signer proof on-chain by calling zkVerify's aggregation contract (`MetaMultiSigWallet.sol:236-253`, `_verifyProof`). zkVerify's aggregation contract is deployed only on Ethereum Sepolia, Base, Horizen, Arbitrum, OP, Apechain, EDU (+ testnets) — **Arc is not on the list**. On Arc `_verifyProof` has no contract to call, so `execute()` cannot verify proofs. | [zkVerify supported chain](https://docs.zkverify.io/architecture/contract-addresses) |
| **Arc's own privacy (APS) can't substitute** | Verified July 2026 from live docs: *"Privacy features are on the roadmap and not yet available on Arc."* Corroborated by Circle's June 2026 "Arc Privacy" announcement, described as *"a proposed design, not a shipping product."* | [Arc opt-in-privacy](https://docs.arc.io/arc/concepts/opt-in-privacy), [crypto.news, Jun 2026](https://crypto.news/circle-unveils-arc-privacy-to-bring-confidential-smart-contracts-to-institutions/) |
| **USDC-as-gas breaks the relayer** | Arc uses USDC as the native gas token. PolyPay's relayer executes txs paying gas in **native ETH** (`relayer-wallet.service.ts`), every chain is defined `nativeCurrency: ETH` (`scaffold.config.ts:12,34`), and price fetch special-cases ETH (`fetchPriceFromUniswap.ts:22-32`). The relayer would need USDC for gas and the ETH assumptions reworked. | [Arc connect-to-arc](https://docs.arc.io/arc/references/connect-to-arc), code |
| **No Arc mainnet** | Verified July 2026: Arc is still public testnet only — the live docs list a testnet chain id (`5042002`) with no mainnet endpoints. Mainnet beta is targeted for summer 2026 but not yet live. Any Arc deploy today is testnet-only. | [Arc connect-to-arc](https://docs.arc.io/arc/references/connect-to-arc), [Phemex: mainnet summer 2026](https://phemex.com/news/article/circle-unveils-arc-blockchain-whitepaper-mainnet-launch-set-for-summer-2026-82817) |

**Note:** "no Kurier on Arc" is *not* the real blocker. Kurier is Horizen Labs' off-chain REST API
to zkVerify (`zkverify.service.ts:57-60`) and is chain-agnostic. The hard dependency is the
**on-chain zkVerify aggregation contract**, which Arc lacks.

### Alternative: keep privacy on Arc without Kurier/zkVerify

PolyPay's circuit is Noir/UltraHonk. Barretenberg can emit a **standalone Solidity verifier** for
that circuit (`bb write_solidity_verifier` → `Verifier.sol`)
([Barretenberg docs](https://barretenberg.aztec.network/docs/how_to_guides/how-to-solidity-verifier/)).
So PolyPay could drop Kurier + zkVerify on Arc and instead:

- deploy the generated UltraHonk `Verifier.sol` on Arc,
- rework `_verifyProof` (`MetaMultiSigWallet.sol:236-253`) to call that verifier directly with the
  full proof instead of `verifyProofAggregation`,
- have the frontend send the full proof to the relayer (no Kurier submit/poll).

This **keeps signer privacy** — same circuit, same commitments + nullifier — with no dependency on
Horizen Labs.

**Does the verifier run on Arc?** The generated Honk verifier requires the `ecAdd`, `ecMul`,
`ecPairing` and `modexp` precompiles ([Barretenberg docs](https://barretenberg.aztec.network/docs/how_to_guides/how-to-solidity-verifier/)).
Arc targets the **Osaka** EVM baseline, and its documented EVM differences remove only
PREVRANDAO / SELFDESTRUCT / EIP-4788 / blob-tx behaviour — the BN254 and modexp precompiles are
**not** among the removed or changed items ([Arc EVM differences](https://docs.arc.io/arc/references/evm-differences)),
and Arc advertises full EVM compatibility. So the verifier should run. Arc publishes no explicit
precompile list, so the one definitive check is to deploy `Verifier.sol` on the live Arc testnet and
verify a proof — a short test, not a blocker.

Trade-offs:

- **Higher on-chain cost** — a full Honk verification per tx, versus zkVerify's amortized aggregate
  (cheap verification is zkVerify's whole point). On Arc that gas is paid in USDC.
- **Contract fork** of `_verifyProof` plus a verifier deploy.
- **Depends on the stalled UltraHonk migration** — PolyPay's bb.js/contract UltraHonk upgrade is
  still pending (`docs/adr/002-ultrahonk-migration.md`); the direct-verifier VK must match the
  proving stack.

**Verdict:** a **private** PolyPay on Arc is feasible **only as a testnet demo** (Arc has no zkVerify
and no live mainnet), via one of two unlocks: (a) Horizen Labs deploys zkVerify on Arc — cheapest
verification, but a partner ask; or (b) PolyPay ships the standalone UltraHonk verifier above — in
our control, at higher gas + engineering cost. Do not target Arc for production until its mainnet
exists.

### Non-private option: a plain multisig on Arc testnet

If the goal is only to have a **live contract address on Arc testnet** — a "we can build on Arc"
milestone, not a product integration — this is easy and separate from everything above.

- The ZK `MetaMultiSigWallet.sol` can't be reused: its `execute()` hard-requires zkVerify proofs
  (`MetaMultiSigWallet.sol:86-105`), with no toggle. A demo needs a **standard ECDSA multisig**
  (signers = addresses, `execute` verifies `ecrecover` signatures — the scaffold-eth pattern the
  wallet was forked from before its ZK conversion).
- No zkVerify, Kurier, Poseidon, or relayer needed (privacy off → signers submit directly). Deploy
  with a viem/ethers script; gas is paid in testnet USDC from [faucet.circle.com](https://faucet.circle.com).
- Scope: a contract address plus a basic transfer / batch demo. Effort ~1 day.
- Caveat: a generic multisig on Arc carries **no PolyPay differentiation** (no signer privacy) — it
  is a presence milestone, not a feature.

Implemented in this branch: `packages/hardhat/contracts/MetaMultiSigWalletArc.sol` (same
transfer/batch surface, ECDSA instead of ZK), the `arcTestnet` network in `hardhat.config.ts`, and
standalone `packages/hardhat/scripts/deployArc.ts` + `scripts/testArc.ts`. Deploy with
`yarn hardhat run scripts/deployArc.ts --network arcTestnet` from a funded Arc testnet account.

**Verified live on Arc testnet** (chainId 5042002): deployed at
[`0xE51f56D21b4d58f336C15c71D5B4A3F040EEd9fa`](https://testnet.arcscan.app/address/0xE51f56D21b4d58f336C15c71D5B4A3F040EEd9fa),
and a 1-of-1 `execute(nonce, to, value, data, signatures)` (owner signs → transfer out) succeeded,
confirming signature verification and execution work with USDC as the gas token. The wallet
parameterizes the nonce (with a `usedNonces` mapping) so off-chain signatures stay valid regardless
of execution ordering.

## 2. Why PolyPay's privacy is chain-bound (context for the blocker)

Signer anonymity has two layers:

- **Commitments** — the wallet stores `poseidonHash2(secret, secret)` per signer, never addresses
  (`MetaMultiSigWallet.sol:46`, `packages/shared/src/crypto/identity.ts:16-37`).
- **ZK membership proof** — a Noir circuit proves a signer knows the secret and signed the tx
  (`packages/nextjs/public/circuit/src/main.nr:51-67`), verified **on the destination chain** via
  zkVerify. This is what ties privacy to a chain: it needs `zkVerifyAddress` + `poseidonT3Address`
  per chain (`packages/shared/src/contracts/contracts-config.ts:1-64`).

Privacy is therefore **not** Horizen-exclusive — it already works on Base and Arbitrum because
zkVerify is deployed there. It fails on any chain that lacks the zkVerify contract.

## 3. Circle products worth integrating (no Arc needed)

Runnable on PolyPay's existing chains, higher value than an Arc deploy. The only Circle product
already in the app is **USDC itself** — Circle's native USDC token contracts, whose EIP-3009 support
powers the x402 gasless deposit (`packages/shared/src/constants/token.ts`). There is no CCTP / Circle
Wallets / Circle Paymaster / ERC-4337 code. (Note: x402 and its facilitators — Coinbase CDP, PayAI —
are Coinbase / third-party, **not** Circle products.) Product list per [circle.com/developer](https://www.circle.com/developer).

| Product | What it does, and the feature PolyPay would gain | Verdict |
|---|---|---|
| **CCTP** | Circle's cross-chain USDC transfer: it burns USDC on one chain and mints native USDC on another (no wrapped tokens, always 1:1). **Feature:** anyone can fund a PolyPay multisig from a different chain and the money lands as real USDC. Works for multisigs on **Base** and **Arbitrum**, but **not Horizen** (Horizen is not a CCTP chain), so it can't fund the primary deployment ([CCTP domains](https://developers.circle.com/cctp/concepts/supported-chains-and-domains)). | **Best fit**, but Base/Arbitrum only. Real code, mainnet-ready. |
| **Gateway** | You deposit USDC once into a Circle Gateway contract and get a single "unified balance" spendable on any supported chain in under 500 ms, without bridging each time — non-custodial, so funds move only with your signature ([Circle Gateway](https://www.circle.com/gateway)). **Feature:** an org keeps its treasury as one USDC pool and funds multisigs on whichever chain a payroll runs on. Live on **Base + Arbitrum** (not Horizen); Circle says Arc is planned. | Good fit for treasury UX, but a bigger build than CCTP. |

Not pursued (documented so the decision is clear): **EURC** — Circle's euro stablecoin is live only on
Base among PolyPay's chains, not Horizen or Arbitrum ([Circle supported chains](https://developers.circle.com/w3s/supported-blockchains-and-currencies)),
so euro payroll would be single-chain and inconsistent. **Paymaster** — PolyPay users already pay no
gas (relayer + x402). **Wallets** — Circle-hosted login would replace PolyPay's own wallet and
ZK-identity model.

## 4. Conclusion

1. **Arc:** demo-only, not production. Arc has no live mainnet (testnet only; mainnet targeted
   "summer 2026", no exact date) and no zkVerify. For a quick "present on Arc" milestone, deploy a
   plain ECDSA multisig on Arc testnet (no privacy, ~1 day — see section 1). A *private* Arc testnet
   demo is also possible but heavier: either ask Horizen Labs to deploy zkVerify on Arc, or ship a
   standalone UltraHonk `Verifier.sol` (in our control, higher gas + a contract fork).
2. **Best Circle integration is CCTP** — fund a multisig cross-chain with native USDC (Base/Arbitrum
   only, no ZK rework). **Gateway** is a larger follow-up for treasury UX. Neither reaches Horizen,
   so both are scoped to PolyPay's Base/Arbitrum deployments.
