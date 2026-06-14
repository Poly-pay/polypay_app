# PolyPay PR Review Checklist

Shared standard for reviewing pull requests — used by human reviewers and by the
automated review in `.github/workflows/claude-review.yaml`. Read `CLAUDE.md` for
the repo's architecture and conventions.

## Priority order

Report findings in this order; correctness always outranks cleanup.

1. **Correctness bugs**
2. **Security**
3. **Convention adherence** (`CLAUDE.md`)
4. **Reuse / simplification / efficiency cleanup**

## Security

PolyPay moves USDC and handles multisig approvals, ZK proofs, and auth. Scrutinise
any change that touches:

- **Signatures & payments** — EIP-3009 / x402 payloads, signature assembly and
  the `v` recovery byte, nonce generation and replay protection, amount bounds.
- **Key material** — anything that could log, leak, or widen access to private
  keys, tokens, or OWS vault flows.
- **Auth & access control** — JWT handling, route guards, `useAuthenticatedQuery`,
  multisig signer/relayer logic, ZK proof verification.
- **Secrets** — never approve committed secrets, hardcoded credentials, or
  plaintext keys. Secret Manager bindings only (see `CLAUDE.md` deployment notes).

## Convention adherence (see `CLAUDE.md`)

- API contracts via `@polypay/shared` DTOs; all HTTP through `apiClient`.
- Zod schemas for every form; `useAuthenticatedQuery` for authenticated queries.
- Business logic in `hooks/app/`, not components; no hardcoded API URLs
  (use `API_BASE_URL`).
- Notifications via the existing `notification` utility / Sonner.
- Zustand stores use `persist` unless state is truly ephemeral.

## Correctness

Bugs a careful reviewer catches in one sitting:

- Inverted or wrong conditions, off-by-one on boundaries.
- Missing `await`, unhandled promise rejections.
- Null / undefined dereferences on reachable paths (error handlers, cold cache,
  missing optional fields), falsy-zero treated as missing.
- Errors swallowed in `catch`, copy-paste of the wrong variable.
- Call sites broken by a changed signature, return shape, or new precondition.

## Output

- Top-level summary via `gh pr comment`; line-level issues as inline comments.
- Cite `file:line`. Be specific and actionable.
- If the diff is clean, say so briefly — do not invent issues.
