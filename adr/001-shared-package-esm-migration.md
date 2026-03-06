# ADR: Migrate @polypay/shared from CommonJS to ESM

**Status:** Accepted  
**Date:** 2026-03-06

## Context

The `@polypay/shared` package was compiled to CommonJS (`"module": "CommonJS"` in tsconfig). This caused two problems in the Next.js frontend:

- `circomlibjs` (~2.8 MB) was statically bundled because `import()` was compiled to `require()`, preventing webpack from creating a lazy chunk.
- `class-validator` (~1.5 MB) was pulled into the frontend through barrel exports. CommonJS prevents tree-shaking, so unused exports were included.

Total first-load JS was ~2.3 MB per route (gzipped), well above the recommended <200 KB threshold.

## Decision

Switch `@polypay/shared` to ESM output and add a post-build fixup script.

### Changes made

1. **`packages/shared/tsconfig.json`** — set `"module": "ES2020"` and `"moduleResolution": "bundler"`.
2. **Barrel imports** — changed `./enums` to `./enums/index` so TypeScript resolves correctly.
3. **`packages/shared/scripts/fix-esm-imports.cjs`** — post-build script that appends `.js` to relative import paths in compiled `dist/` files.
4. **`packages/shared/package.json`** — build script updated to `tsc && node scripts/fix-esm-imports.cjs`.
5. **`packages/nextjs/next.config.ts`** — added `transpilePackages: ["@polypay/shared"]`.

### Why the post-build script?

Three consumers read `@polypay/shared` differently:

| Consumer | Reads from | Extension needed? |
|---|---|---|
| Next.js (webpack) | `dist/` | No (webpack resolves without `.js`) |
| Node.js ESM (NestJS backend) | `dist/` | Yes (Node ESM requires `.js`) |
| Jest (ts-jest) | `src/` | No (ts-jest resolves `.ts` directly; `.js` would break) |

Keeping source imports extension-less satisfies Jest. The post-build script adds `.js` extensions in `dist/` to satisfy Node.js. Webpack handles both.

## Result

First-load JS dropped from ~2.3 MB to ~400 KB per route (≈80% reduction). `circomlibjs` is now lazy-loaded. `class-validator` is tree-shaken out of the frontend bundle.

## Do not revert

| Setting | Why |
|---|---|
| `"module": "ES2020"` in tsconfig | Reverting re-introduces the 2.3 MB bundle regression |
| `fix-esm-imports.cjs` script | Backend fails at runtime without `.js` extensions |
| Extension-less imports in source (`src/`) | Jest breaks if source files contain `.js` imports |
| `transpilePackages` in next.config | Required for webpack to tree-shake the shared package |

## References

- [Node.js ESM documentation](https://nodejs.org/api/esm.html)
- [Next.js transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
