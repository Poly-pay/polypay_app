# Arc Multisig Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a staging user create a non-private ECDSA multisig on Circle's Arc testnet and run one USDC transfer through it (propose → approve → execute) in the existing UI.

**Architecture:** A parallel Arc module (Approach B). The ZK auth/account/transaction/proof code paths are NOT modified. Arc uses SIWE login (JWT keyed by address), an ECDSA multisig (`MetaMultiSigWalletArc`, already deployed + tested), and the relayer to submit deploy + execute. Shared surfaces are additive-only: Prisma migration, chain config, a dashboard union query.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), Next.js 15/React 19, wagmi 2 / viem 2, OpenZeppelin 5 ECDSA (on-chain). The backend/relayer uses **viem** (NOT ethers) — all Arc web3 (signature verify, deploy, execute) uses viem. Auth is a wallet-signature nonce challenge verified with viem `verifyMessage`.

## Global Constraints

- Arc testnet chainId: `5042002`. RPC: `https://rpc.testnet.arc.network`. Explorer: `https://testnet.arcscan.app`.
- On Arc, USDC is the NATIVE token (18 decimals). USDC transfers are native value transfers, not ERC20 calls.
- Deployed demo contract (reference): `0x41D925843a192F859cf14aba4789744b1e58eB15`.
- Chain routing: a chain is `ecdsa` when it has no zkVerify config (Arc), else `zk`.
- Do NOT modify existing ZK modules: `auth`, `account`, `transaction`, `zkverify`, or the frontend hooks `useAuthProof`, `useGenerateProof`, `useIdentityStore`.
- The relayer wallet (`RELAYER_WALLET_KEY`) must hold Arc testnet USDC (native gas) before deploy/execute work on Arc. Fund via `https://faucet.circle.com`.
- Signatures for `execute` MUST be sorted ascending by recovered signer address (contract enforces uniqueness/order via `uint160(recovered) > uint160(lastSigner)`).
- Signers sign `getTransactionHash(nonce, to, value, data)` as an EIP-191 personal message (`personal_sign` / viem `signMessage` over the 32 raw bytes).
- No emojis in code/commits. Commits in English. Do not add AI co-author trailer.

---

## File Structure

**Shared (`packages/shared`)**
- Create `src/contracts/metaMultiSigWalletArc.ts` — ABI + bytecode const.
- Modify `src/constants/chains.ts` — add Arc testnet id + `chainType` helper.

**Backend (`packages/backend/src`)**
- Modify `prisma/schema.prisma` — additive fields + migration.
- Create `arc/arc-auth/` — SIWE nonce + login, `ArcJwtStrategy`, `ArcAuthGuard`.
- Create `arc/arc-account/` — create Arc multisig.
- Create `arc/arc-transaction/` — propose/approve/execute.
- Modify `relayer-wallet/relayer-wallet.service.ts` — add `deployArcAccount`, `executeArcTransaction`.
- Create `arc/arc.module.ts` — wires the three Arc sub-modules; imported by `app.module.ts`.

**Frontend (`packages/nextjs`)**
- Modify `scaffold.config.ts` — add Arc testnet to `targetNetworks`.
- Create `hooks/app/arc/useArcAuth.ts`, `useArcCreateAccount.ts`, `useArcTransfer.ts`.
- Create `services/api/arcApi.ts`.
- Create `app/arc/create/page.tsx`, and an Arc transfer view.
- Modify the dashboard account list to union Arc accounts + badge.

---

## Task 1: Shared — Arc contract artifact + chain type

**Files:**
- Create: `packages/shared/src/contracts/metaMultiSigWalletArc.ts`
- Modify: `packages/shared/src/constants/chains.ts`
- Test: `packages/shared/src/constants/__tests__/chains.spec.ts`

**Interfaces:**
- Produces: `ARC_TESTNET_CHAIN_ID = 5042002`; `getChainType(chainId: number): "zk" | "ecdsa"`; `META_MULTISIG_ARC_ABI`, `META_MULTISIG_ARC_BYTECODE`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/constants/__tests__/chains.spec.ts
import { getChainType, ARC_TESTNET_CHAIN_ID } from "../chains";

describe("getChainType", () => {
  it("returns ecdsa for Arc testnet", () => {
    expect(getChainType(ARC_TESTNET_CHAIN_ID)).toBe("ecdsa");
  });
  it("returns zk for Horizen testnet", () => {
    expect(getChainType(2651420)).toBe("zk");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @polypay/shared test chains.spec`
Expected: FAIL (`getChainType` / `ARC_TESTNET_CHAIN_ID` not exported).

- [ ] **Step 3: Add the chain type helper**

Add to `packages/shared/src/constants/chains.ts` (alongside the existing `CHAIN_IDS`):

```typescript
export const ARC_TESTNET_CHAIN_ID = 5042002;

// A chain is "ecdsa" (non-private) when it has no zkVerify deployment (Arc). All
// currently-supported chains except Arc are "zk".
export function getChainType(chainId: number): "zk" | "ecdsa" {
  return chainId === ARC_TESTNET_CHAIN_ID ? "ecdsa" : "zk";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn workspace @polypay/shared test chains.spec`
Expected: PASS.

- [ ] **Step 5: Add the Arc contract ABI + bytecode**

Extract from the compiled artifact `packages/hardhat/artifacts/contracts/MetaMultiSigWalletArc.sol/MetaMultiSigWalletArc.json` (run `yarn workspace @polypay/hardhat compile` first if missing). Create `packages/shared/src/contracts/metaMultiSigWalletArc.ts`:

```typescript
// ABI + bytecode copied from the compiled MetaMultiSigWalletArc artifact.
// Regenerate by recompiling the hardhat package if the contract changes.
export const META_MULTISIG_ARC_ABI = [/* paste artifact.abi */] as const;
export const META_MULTISIG_ARC_BYTECODE = "0x..."; /* paste artifact.bytecode */
```

Export it from the shared contracts barrel (mirror how `METAMULTISIG_ABI` is exported in `packages/shared/src/contracts/`).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/contracts/metaMultiSigWalletArc.ts packages/shared/src/constants/chains.ts packages/shared/src/constants/__tests__/chains.spec.ts
git commit -m "feat(shared): add Arc chain type + MetaMultiSigWalletArc artifact"
```

---

## Task 2: Backend — Prisma additive migration

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`
- Migration: `packages/backend/prisma/migrations/<generated>/migration.sql`

**Interfaces:**
- Produces: `Account.chainType`, `AccountSigner.address`, `User.address`, and a `signature` field on the transaction vote model.

- [ ] **Step 1: Edit the schema (additive only)**

In `packages/backend/prisma/schema.prisma`:
- On `Account`: add `chainType String @default("zk")`.
- On `AccountSigner`: add `address String?`.
- On `User`: add `address String? @unique`, and change `commitment` to nullable (`commitment String? @unique`).
- On the transaction vote model (the model holding per-signer votes/proofs): add `signature String?`.

- [ ] **Step 2: Generate the migration**

Run: `yarn workspace @polypay/backend prisma migrate dev --name arc_ecdsa_fields`
Expected: a new migration is created and applies cleanly to the dev DB; `prisma generate` runs.

- [ ] **Step 3: Verify existing ZK rows unaffected**

Run: `yarn workspace @polypay/backend prisma studio` (or a quick query) and confirm existing `Account` rows now have `chainType = "zk"` and `User.commitment` still populated.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations
git commit -m "feat(backend): additive Arc/ECDSA fields on Account, AccountSigner, User, vote"
```

---

## Task 3: Backend — Arc wallet-signature auth (nonce challenge)

**Files:**
- Create: `packages/backend/src/arc/arc-auth/arc-auth.service.ts`, `arc-auth.controller.ts`, `arc-auth.module.ts`, `dto/arc-login.dto.ts`, `dto/arc-nonce.dto.ts`
- Create: `packages/backend/src/arc/arc-auth/arc-jwt.strategy.ts`, `arc-auth.guard.ts`
- Test: `packages/backend/src/arc/arc-auth/arc-auth.service.spec.ts`

**Interfaces:**
- Consumes: existing `JwtService`; ethers v6 `verifyMessage`, `randomBytes`, `hexlify`.
- Produces: `POST /arc/auth/nonce { address } -> { nonce }`; `POST /arc/auth/login { address, signature } -> { accessToken }` with JWT payload `{ sub: address(lowercased), chainType: "ecdsa" }`. `ArcAuthGuard` protecting Arc routes. Login message format: `` `PolyPay Arc login: ${nonce}` ``.

- [ ] **Step 1: Write the failing test**

```typescript
// arc-auth.service.spec.ts
import { Wallet } from "ethers";
import { ArcAuthService } from "./arc-auth.service";
import { JwtService } from "@nestjs/jwt";

describe("ArcAuthService", () => {
  const jwt = { sign: (p: any) => `token:${p.sub}` } as unknown as JwtService;
  let service: ArcAuthService;
  beforeEach(() => (service = new ArcAuthService(jwt)));

  it("issues a token keyed by the recovered address when the nonce message is signed", async () => {
    const signer = Wallet.createRandom();
    const nonce = service.getNonce(signer.address);
    const signature = await signer.signMessage(`PolyPay Arc login: ${nonce}`);
    const res = await service.login(signer.address, signature);
    expect(res.accessToken).toBe(`token:${signer.address.toLowerCase()}`);
  });

  it("rejects a signature from a different signer", async () => {
    const signer = Wallet.createRandom();
    const other = Wallet.createRandom();
    const nonce = service.getNonce(signer.address);
    const signature = await other.signMessage(`PolyPay Arc login: ${nonce}`);
    await expect(service.login(signer.address, signature)).rejects.toThrow();
  });

  it("rejects reuse of a consumed nonce", async () => {
    const signer = Wallet.createRandom();
    const nonce = service.getNonce(signer.address);
    const signature = await signer.signMessage(`PolyPay Arc login: ${nonce}`);
    await service.login(signer.address, signature);
    await expect(service.login(signer.address, signature)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @polypay/backend test arc-auth.service`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the service**

```typescript
// arc-auth.service.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verifyMessage, randomBytes, hexlify } from "ethers";

// In-memory nonce store, keyed by lowercased address. Single-instance staging demo only;
// a multi-instance deployment would move this to Redis/DB. Nonces are one-time use.
@Injectable()
export class ArcAuthService {
  private readonly nonces = new Map<string, string>();

  constructor(private readonly jwt: JwtService) {}

  getNonce(address: string): string {
    const nonce = hexlify(randomBytes(16));
    this.nonces.set(address.toLowerCase(), nonce);
    return nonce;
  }

  async login(address: string, signature: string): Promise<{ accessToken: string }> {
    const key = address.toLowerCase();
    const nonce = this.nonces.get(key);
    if (!nonce) throw new UnauthorizedException("No nonce issued for this address");

    const recovered = verifyMessage(`PolyPay Arc login: ${nonce}`, signature).toLowerCase();
    if (recovered !== key) throw new UnauthorizedException("Invalid signature");

    this.nonces.delete(key); // one-time use
    const accessToken = this.jwt.sign({ sub: key, chainType: "ecdsa" });
    return { accessToken };
  }
}
```

(Persisting the `User(address)` row happens in Task 4's account creation; login only authenticates.)

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn workspace @polypay/backend test arc-auth.service`
Expected: PASS.

- [ ] **Step 5: Add controller, strategy, guard, module**

`arc-auth.controller.ts` exposes `POST /arc/auth/nonce` (body `{ address }`) and `POST /arc/auth/login` (body `{ address, signature }`). `arc-jwt.strategy.ts` mirrors the existing `JwtStrategy` but validates the `chainType === "ecdsa"` claim and returns `{ address: payload.sub }` (does not look up by commitment). `ArcAuthGuard extends AuthGuard("arc-jwt")`. `arc-auth.module.ts` imports `JwtModule` (reuse existing config/secret) and exports the service + guard.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/arc/arc-auth
git commit -m "feat(backend): Arc wallet-signature auth (nonce challenge, arc-jwt strategy/guard)"
```

---

## Task 4: Backend — Arc account creation + relayer deploy

**Files:**
- Modify: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
- Create: `packages/backend/src/arc/arc-account/arc-account.service.ts`, `arc-account.controller.ts`, `arc-account.module.ts`, `dto/create-arc-account.dto.ts`
- Test: `packages/backend/src/arc/arc-account/arc-account.service.spec.ts`, `relayer-wallet.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `META_MULTISIG_ARC_ABI`, `META_MULTISIG_ARC_BYTECODE`, `ARC_TESTNET_CHAIN_ID` from `@polypay/shared`; `ArcAuthGuard`.
- Produces: `RelayerWalletService.deployArcAccount(owners: string[], threshold: number, chainId: number): Promise<string>` (returns wallet address). `POST /arc/accounts { owners, threshold, chainId } -> { address }`.

- [ ] **Step 1: Write the failing relayer test**

```typescript
// relayer-wallet.service.spec.ts (add)
it("deployArcAccount deploys MetaMultiSigWalletArc with [chainId, owners, threshold]", async () => {
  const owners = ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"];
  const addr = await service.deployArcAccount(owners, 2, 5042002);
  expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
});
```

Use the existing test setup pattern in the relayer spec (mock provider/wallet or a local hardhat node). If the suite deploys against a local node, deploy the Arc contract there with chainId arg 5042002 (the constructor takes chainId as data, not the network id, so a local node is fine).

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @polypay/backend test relayer-wallet.service`
Expected: FAIL (`deployArcAccount` not a function).

- [ ] **Step 3: Implement `deployArcAccount` (viem — mirror existing `deployAccount`)**

The relayer uses **viem**, not ethers. FIRST read the existing `deployAccount` method in `relayer-wallet.service.ts` and copy its exact walletClient/publicClient/account construction (chain object, transport, account source). Then add a sibling method changing only the abi/bytecode/args:

```typescript
import { META_MULTISIG_ARC_ABI, META_MULTISIG_ARC_BYTECODE } from "@polypay/shared";

async deployArcAccount(owners: string[], threshold: number, chainId: number): Promise<string> {
  // build walletClient + publicClient + account exactly as deployAccount does for this chainId
  const hash = await walletClient.deployContract({
    abi: META_MULTISIG_ARC_ABI,
    bytecode: META_MULTISIG_ARC_BYTECODE as `0x${string}`,
    args: [BigInt(chainId), owners as `0x${string}`[], BigInt(threshold)],
    account,
    chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Arc wallet deploy: no contractAddress in receipt");
  return receipt.contractAddress;
}
```

Do NOT introduce ethers. Match the exact client/account/chain construction the existing viem `deployAccount` uses.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn workspace @polypay/backend test relayer-wallet.service`
Expected: PASS.

- [ ] **Step 5: Write the failing account-service test**

```typescript
// arc-account.service.spec.ts
it("creates an Arc account: deploys, persists Account(ecdsa)+signers+users", async () => {
  const owners = ["0xAAaAAA...40hex", "0xBBbBBB...40hex"];
  const relayer = { deployArcAccount: jest.fn().mockResolvedValue("0xWALLET") };
  const prisma = makePrismaMock();
  const service = new ArcAccountService(relayer as any, prisma as any);
  const res = await service.create({ owners, threshold: 2, chainId: 5042002 });
  expect(res.address).toBe("0xWALLET");
  expect(prisma.account.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ chainType: "ecdsa" }) }));
});
```

- [ ] **Step 6: Run test to verify it fails, implement, verify pass**

Implement `ArcAccountService.create(dto)`: validate `owners` are checksummed addresses and `1 <= threshold <= owners.length` and `getChainType(chainId) === "ecdsa"`; call `relayer.deployArcAccount`; persist `Account({ chainType: "ecdsa", address, threshold, chainId })`, one `AccountSigner({ address })` per owner, and upsert `User({ address })` per owner. Controller `POST /arc/accounts` guarded by `ArcAuthGuard`.
Run: `yarn workspace @polypay/backend test arc-account.service` → PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/arc/arc-account packages/backend/src/relayer-wallet
git commit -m "feat(backend): Arc account creation + relayer deployArcAccount"
```

---

## Task 5: Backend — Arc transaction propose/approve/execute + relayer execute

**Files:**
- Modify: `packages/backend/src/relayer-wallet/relayer-wallet.service.ts`
- Create: `packages/backend/src/arc/arc-transaction/arc-transaction.service.ts`, `arc-transaction.controller.ts`, `arc-transaction.module.ts`, `dto/*.ts`
- Create: `packages/backend/src/arc/arc-transaction/signature.util.ts`
- Test: `signature.util.spec.ts`, `arc-transaction.service.spec.ts`, extend relayer spec

**Interfaces:**
- Consumes: `META_MULTISIG_ARC_ABI`, `ArcAuthGuard`.
- Produces: `recoverArcSigner(walletAddress, chainId, nonce, to, value, data, signature): Promise<string>` (async — viem recover is async); `RelayerWalletService.executeArcTransaction(walletAddress, to, value, data, signatures[], chainId)`; endpoints `POST /arc/transactions`, `POST /arc/transactions/:id/approve`, `POST /arc/transactions/:id/execute`.

- [ ] **Step 1: Write the failing signature-util test**

```typescript
// signature.util.spec.ts
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { encodePacked, keccak256 } from "viem";
import { recoverArcSigner } from "./signature.util";

it("recovers the signer of an EIP-191 signed tx hash", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const wallet = "0x41D925843a192F859cf14aba4789744b1e58eB15";
  const [chainId, nonce, to, value, data] = [5042002, 0, account.address, 10n, "0x"] as const;
  const txHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "address", "uint256", "bytes"],
      [wallet, BigInt(chainId), BigInt(nonce), to, value, data],
    ),
  );
  const signature = await account.signMessage({ message: { raw: txHash } });
  const recovered = await recoverArcSigner(wallet, chainId, nonce, to, value, data, signature);
  expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn workspace @polypay/backend test signature.util`
Expected: FAIL.

- [ ] **Step 3: Implement `recoverArcSigner`**

```typescript
// signature.util.ts
import { encodePacked, keccak256, recoverMessageAddress, type Hex } from "viem";

export async function recoverArcSigner(
  wallet: string,
  chainId: number,
  nonce: number,
  to: string,
  value: bigint,
  data: string,
  signature: string,
): Promise<string> {
  const txHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "address", "uint256", "bytes"],
      [wallet as Hex, BigInt(chainId), BigInt(nonce), to as Hex, value, data as Hex],
    ),
  );
  // The signer signs the 32 raw bytes as a personal message; the contract recovers over
  // toEthSignedMessageHash(txHash), which viem's recoverMessageAddress with { raw } reproduces.
  return await recoverMessageAddress({ message: { raw: txHash }, signature: signature as Hex });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn workspace @polypay/backend test signature.util`
Expected: PASS.

- [ ] **Step 5: Implement `executeArcTransaction` (relayer) + failing test**

Test: with 2 signatures over the same txHash, `executeArcTransaction` sorts them ascending by recovered address and calls `execute(to, value, data, sorted)`.

```typescript
// relayer-wallet.service.ts (add — viem; mirror the existing execute path's client/account/chain setup)
async executeArcTransaction(
  walletAddress: string, to: string, value: bigint, data: string, signatures: string[], chainId: number,
): Promise<string> {
  // build walletClient + publicClient + account + chain exactly as the existing execute/deploy methods do
  const nonce = (await publicClient.readContract({
    address: walletAddress as `0x${string}`, abi: META_MULTISIG_ARC_ABI, functionName: "nonce",
  })) as bigint;
  // contract requires signatures strictly ascending by recovered signer address
  const withAddr = await Promise.all(
    signatures.map(async s => ({
      s,
      a: (await recoverArcSigner(walletAddress, chainId, Number(nonce), to, value, data, s)).toLowerCase(),
    })),
  );
  withAddr.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));
  const hash = await walletClient.writeContract({
    address: walletAddress as `0x${string}`, abi: META_MULTISIG_ARC_ABI, functionName: "execute",
    args: [to as `0x${string}`, value, data as `0x${string}`, withAddr.map(x => x.s as `0x${string}`)],
    account, chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.transactionHash;
}
```

Run: `yarn workspace @polypay/backend test relayer-wallet.service` → PASS.

- [ ] **Step 6: Implement `ArcTransactionService` + failing tests**

Behaviors to test:
- `propose(dto, address)` — creates a `Transaction(accountId, to, value, data, chainId)` and stores the first vote `{ signature }`; rejects if `recoverArcSigner(...)` is not an account owner.
- `approve(id, { signature }, address)` — recovers signer, requires it to be an owner, rejects duplicate signer (dedupe by recovered address), stores the vote.
- `execute(id)` — loads the transaction + votes; if collected valid signatures `>= account.threshold`, calls `relayer.executeArcTransaction(...)` and marks executed; else throws `BadRequestException("threshold not met")`.

Implement, then run: `yarn workspace @polypay/backend test arc-transaction.service` → PASS.

- [ ] **Step 7: Controller + module**

`arc-transaction.controller.ts` (guarded by `ArcAuthGuard`) exposes the three routes. `arc-transaction.module.ts` provides the service + imports the relayer module. Create `arc/arc.module.ts` importing `ArcAuthModule`, `ArcAccountModule`, `ArcTransactionModule`; import `ArcModule` in `app.module.ts`.

- [ ] **Step 8: Commit**

```bash
git add packages/backend/src/arc packages/backend/src/relayer-wallet packages/backend/src/app.module.ts
git commit -m "feat(backend): Arc transaction propose/approve/execute + relayer executeArcTransaction"
```

---

## Task 6: Frontend — Arc chain config + SIWE login hook + API client

**Files:**
- Modify: `packages/nextjs/scaffold.config.ts`
- Create: `packages/nextjs/services/api/arcApi.ts`
- Create: `packages/nextjs/hooks/app/arc/useArcAuth.ts`
- Test: `packages/nextjs/hooks/app/arc/__tests__/useArcAuth.test.ts`

**Interfaces:**
- Produces: Arc testnet in `targetNetworks`; `arcApi.getNonce()`, `arcApi.login(message, signature)`, `arcApi.createAccount(dto)`, `arcApi.proposeTx/approveTx/executeTx`; `useArcAuth()` returning `{ login, isAuthenticated }`.

- [ ] **Step 1: Add Arc testnet to `targetNetworks`**

In `packages/nextjs/scaffold.config.ts`, define an Arc testnet chain via viem `defineChain` (id 5042002, rpc `https://rpc.testnet.arc.network`, nativeCurrency `{ name: "USD Coin", symbol: "USDC", decimals: 18 }`, explorer `https://testnet.arcscan.app`) and add it to the testnet `targetNetworks` array.

- [ ] **Step 2: Implement `arcApi.ts`**

Mirror `services/api/transactionApi.ts` object-export pattern, using `apiClient`. Endpoints: `POST /arc/auth/nonce`, `POST /arc/auth/login`, `POST /arc/accounts`, `POST /arc/transactions`, `POST /arc/transactions/:id/approve`, `POST /arc/transactions/:id/execute`.

- [ ] **Step 3: Write the failing `useArcAuth` test**

Test that `login()` builds a SIWE message with the fetched nonce, calls `signMessageAsync`, posts to `arcApi.login`, and stores the returned token.

- [ ] **Step 4: Implement `useArcAuth`**

Use wagmi `useSignMessage` + `siwe` `SiweMessage` to build/sign, then `arcApi.login`. Store the JWT in the existing identity/token store under an Arc-scoped key (do NOT overwrite the ZK session token). Run the test → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/nextjs/scaffold.config.ts packages/nextjs/services/api/arcApi.ts packages/nextjs/hooks/app/arc
git commit -m "feat(frontend): Arc testnet config, arcApi client, SIWE login hook"
```

---

## Task 7: Frontend — create Arc multisig page

**Files:**
- Create: `packages/nextjs/hooks/app/arc/useArcCreateAccount.ts`
- Create: `packages/nextjs/app/arc/create/page.tsx`
- Test: `packages/nextjs/hooks/app/arc/__tests__/useArcCreateAccount.test.ts`

**Interfaces:**
- Consumes: `arcApi.createAccount`, `useArcAuth`.
- Produces: `useArcCreateAccount()` → `{ createAccount(owners, threshold), isPending }`.

- [ ] **Step 1: Failing hook test** — `createAccount(["0x..","0x.."], 2)` calls `arcApi.createAccount({ owners, threshold: 2, chainId: 5042002 })` and returns the new address.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement the hook** (React Query `useMutation`, invalidate the accounts list key on success).
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Build the page** `app/arc/create/page.tsx`: connect-wallet gate, a form (React Hook Form + Zod) for a dynamic list of owner addresses + a threshold number, calling `useArcCreateAccount`. Mirror `components/NewAccount/NewAccountContainer.tsx` layout but with address inputs instead of commitments. On success, `notification.success` + route to the account view.
- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/hooks/app/arc packages/nextjs/app/arc/create
git commit -m "feat(frontend): create Arc multisig page + hook"
```

---

## Task 8: Frontend — Arc transfer flow (propose/approve/execute)

**Files:**
- Create: `packages/nextjs/hooks/app/arc/useArcTransfer.ts`
- Create: an Arc transfer view under `app/arc/` (or reuse the transfer UI shell with an Arc branch by `chainType`)
- Test: `packages/nextjs/hooks/app/arc/__tests__/useArcTransfer.test.ts`

**Interfaces:**
- Consumes: `arcApi`, wagmi `useSignMessage`, `META_MULTISIG_ARC_ABI` (to read `getTransactionHash`/`nonce` via viem `usePublicClient`).
- Produces: `useArcTransfer()` → `{ propose(to, amount), approve(txId), execute(txId) }`.

**Nonce comes from the backend (parameterized-nonce contract).** The contract's `execute` takes the
nonce as a parameter (with a `usedNonces` mapping), so the proposer must sign over the SAME nonce the
backend will store and later pass to `execute`. Add a backend read `GET /arc/accounts/:accountId/next-nonce`
(in the arc-transaction or arc-account controller) returning the next nonce the backend would assign
(its existing `getNextNonce`). The frontend fetches that nonce before signing. Approvers read the
proposed transaction's `nonce` (returned by the propose response / tx detail) and sign over it.

- [ ] **Step 1: Failing test for `propose`**

`propose(to, amount)`: fetch `nonce` from `arcApi.nextNonce(accountId)`, compute
`txHash = keccak256(encodePacked(["address","uint256","uint256","address","uint256","bytes"], [wallet, chainId, nonce, to, amount, "0x"]))` client-side with viem (matching the contract), sign it with `signMessage({ message: { raw: txHash } })`, and post `{ accountId, nonce, to, value: amount, data: "0x", signature }` to `arcApi.proposeTx`.

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement the hook.** Note: on Arc, USDC is native, so `to` = recipient, `value` = amount, `data` = `"0x"` (no ERC20 encoding). Sign the 32-byte tx hash as a raw message (matches the contract's `toEthSignedMessageHash`). The proposer/approver must sign over the backend-provided nonce (not a contract-read nonce — the contract no longer exposes an auto-increment counter).
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Build the transfer view** — recipient + amount form; a proposed-tx view listing collected approvals vs threshold; an Execute button (enabled at threshold) that calls `arcApi.executeTx`. Use `notification` + `formatErrorMessage`.
- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/hooks/app/arc packages/nextjs/app/arc
git commit -m "feat(frontend): Arc transfer propose/approve/execute flow"
```

---

## Task 9: Frontend — dashboard union + non-private badge

**Files:**
- Modify: the dashboard account-list component + its data hook (`hooks/api/useAccount*`)
- Test: extend the account-list hook test

**Interfaces:**
- Consumes: existing ZK accounts query + a new Arc accounts query (`GET /arc/accounts` for the logged-in address — add this read endpoint in Task 4's controller if not present).

- [ ] **Step 1: Failing test** — the account-list hook returns the union of ZK accounts and Arc accounts, each tagged with `chainType`.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the union in the accounts hook (keep the two sources separate queries; merge in the hook).
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Render the badge** — in the account card, when `chainType === "ecdsa"`, show a "Non-private (signers public)" badge.
- [ ] **Step 6: Commit**

```bash
git add packages/nextjs
git commit -m "feat(frontend): union Arc accounts into dashboard with non-private badge"
```

---

## Task 10: Manual staging E2E + relayer funding

- [ ] **Step 1:** Fund the staging relayer wallet with Arc testnet USDC from `https://faucet.circle.com`.
- [ ] **Step 2:** On staging: SIWE-login with an Arc wallet, create a 2-of-2 Arc multisig.
- [ ] **Step 3:** Fund the new multisig with a little Arc testnet USDC.
- [ ] **Step 4:** Propose a transfer, approve with the second owner, execute.
- [ ] **Step 5:** Confirm the transfer on `https://testnet.arcscan.app` and that the account/tx show in the dashboard with the non-private badge.

---

## Self-Review

**Spec coverage:** data model (T2), SIWE auth (T3), arc-account + relayer deploy (T4), arc-transaction + relayer execute (T5), USDC-native transfer (T8 step 3), shared ABI/chain (T1), frontend create/transfer/dashboard (T6-T9), relayer funding ops note (T10). All spec sections map to a task.

**Placeholder scan:** the only intentional paste-in is the artifact ABI/bytecode (T1 step 5) and viem chain definition (T6 step 1) — both reference the exact source. No "TBD"/"handle edge cases" left.

**Type consistency:** `recoverArcSigner` signature is identical in T5 step 3, its test, and the relayer sort in T5 step 5. `deployArcAccount(owners, threshold, chainId)` and `executeArcTransaction(walletAddress, to, value, data, signatures, chainId)` are used consistently across relayer + services. `getChainType`/`ARC_TESTNET_CHAIN_ID` from T1 used in T4/T6.
