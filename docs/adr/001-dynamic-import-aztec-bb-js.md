# ADR-001: Dynamic import for @aztec/bb.js

## Status

Accepted

## Context

`@aztec/bb.js` is a heavy WASM-based cryptographic library used for ZK proof generation (UltraHonk/UltraPlonk backends). It is only needed when users perform specific actions: signing transactions, approving votes, or authenticating with ZK proofs.

If imported statically (`import { UltraHonkBackend } from '@aztec/bb.js'`), Next.js bundles the entire library into the initial JS chunk. This significantly increases the first load JS size for every page, even pages that never generate proofs.

## Decision

Use dynamic `import()` for `@aztec/bb.js` (and `@noir-lang/noir_js`) at the point of use inside proof generation hooks:

```typescript
// Instead of top-level static import
const { UltraHonkBackend } = await import("@aztec/bb.js");
const { Noir } = await import("@noir-lang/noir_js");
```

This applies to:
- `packages/nextjs/hooks/app/useGenerateProof.ts`
- `packages/nextjs/hooks/app/useAuthProof.ts`

## Consequences

- First load JS stays small — cryptographic libraries are only fetched when a user initiates a proof generation action
- Slight delay when generating the first proof in a session (library download + WASM initialization), but this is acceptable since proof generation itself already takes seconds
- Must use `await import()` pattern consistently — never add static imports for these packages in frontend code
