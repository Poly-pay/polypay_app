# ADR-002: UltraPlonk to UltraHonk Migration

## Status

Accepted

## Context

UltraPlonk is deprecated from bbup v0.87.0+. zkVerify supports UltraHonk as replacement. Migration needed across the full stack: frontend proof generation, backend proof submission (Kurier API), and smart contract verification.

## Decision

New accounts (contractVersion >= 2) use UltraHonk. Old accounts (contractVersion 1) continue using UltraPlonk. The `contractVersion` field on the Account model drives all branching.

## Key Findings (not obvious from docs)

### 1. `{ keccak: true }` is mandatory

zkVerify only supports Keccak256 hash for UltraHonk. bb.js defaults to non-keccak. Must pass `{ keccak: true }` to both `generateProof` and `getVerificationKey`:

```typescript
const backend = new UltraHonkBackend(bytecode);
const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
const vk = await backend.getVerificationKey({ keccak: true });
```

Without keccak, the VK size is 1825 bytes instead of expected 1760 bytes, and proofs won't verify.

### 2. Variant must be `'Plain'`, not `'ZK'`

bb.js `acirProveUltraKeccakHonk` generates **Plain** (non-ZK) proofs. There is no `--zk` option in the bb.js API. Using `variant: 'ZK'` causes proof verification to fail silently (`optimisticVerify: "failed"`).

### 3. Kurier API format differs completely from UltraPlonk

| Aspect | UltraPlonk | UltraHonk |
|--------|-----------|----------|
| VK encoding | base64 | hex `0x`-prefixed |
| Proof encoding | base64 (public inputs concatenated) | hex `0x`-prefixed |
| Public inputs | Concatenated into proof bytes | Separate `publicSignals` array |
| proofOptions (register-vk) | `{ numberOfPublicInputs }` | `{ variant: 'Plain' }` |
| proofOptions (submit-proof) | `{ numberOfPublicInputs }` | `{ variant: 'Plain' }` |

### 4. VK file naming includes proof type

VK files use the pattern `vkey-{circuitType}-{proofType}.json` to support both systems simultaneously:
- `vkey-transaction-ultraplonk.json` (old accounts)
- `vkey-transaction-ultrahonk.json` (new accounts)

### 5. Smart contract vkHash must match

The `vkHash` in `contracts-config.ts` is used when deploying new multisig contracts. It must match the vkHash from the UltraHonk VK registration on zkVerify. Old deployed contracts are unaffected (vkHash is immutable).

## Consequences

- Both proving systems coexist — no breaking changes for existing accounts
- `contractVersion` must be included in ALL API responses that return account data (including `user.service.ts getAccounts`)
- Future bb.js versions may add ZK support — at that point, switch variant from `'Plain'` to `'ZK'` for better privacy
