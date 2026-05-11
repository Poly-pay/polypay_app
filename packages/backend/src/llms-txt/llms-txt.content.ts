/**
 * Manual sections injected into llms-full.txt — content that is not derivable
 * from the OpenAPI document (cross-cutting concerns, WebSocket events, flows).
 * Edit here when error envelope, rate limits, socket events, or canonical
 * flows change.
 */

export const COMMON_ERRORS_SECTION = `## Error responses

All error responses follow the NestJS error envelope:

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed" | ["field1 must be a string"],
  "error": "Bad Request"
}
\`\`\`

Common status codes:

- \`400\` — Validation error (check \`message\` for field-level details)
- \`401\` — Missing or invalid JWT (call \`POST /api/auth/refresh\`)
- \`403\` — Authenticated but lacks permission (e.g. not a signer of the account)
- \`404\` — Resource not found
- \`409\` — Conflict (e.g. duplicate vote, already executed)
- \`429\` — Rate limited (respect \`Retry-After\` header)
- \`500\` — Internal server error (retry with backoff)

ZK-proof endpoints may also fail asynchronously on zkVerify — the API returns
\`201\` immediately and reports the proof verdict via the \`tx:status\`
WebSocket event (status \`PROOF_FAILED\` or \`EXECUTION_FAILED\`).
`;

export const RATE_LIMITS_SECTION = `## Rate limits

Throttle is applied per IP. Window size is 60 seconds.

| Scope | Limit / minute |
|---|---|
| Default (most endpoints) | 60 |
| \`POST /api/auth/login\` | 5 |
| \`POST /api/auth/refresh\` | 30 |
| Mutating transaction endpoints | 5 – 20 |
| x402 deposit endpoints | 10 – 60 |

When throttled, the API returns \`429\` with a \`Retry-After\` header (seconds).
`;

export const WEBSOCKET_EVENTS_SECTION = `## WebSocket events

Real-time updates are delivered over Socket.io. The transport is not described
in the OpenAPI document.

- **URL**: same origin as the HTTP API (Socket.io default path \`/socket.io\`)
- **Transport**: socket.io v4
- **CORS**: \`*\` (any origin allowed)
- **Auth via handshake query params** — the gateway joins rooms based on these:
  \`\`\`js
  io(host, { query: { commitment: '<userCommitment>', accountAddress: '0x...' } })
  \`\`\`
  - \`commitment\` — joins your personal events room (e.g. \`account:created\` for multisigs you were added to as a signer)
  - \`accountAddress\` — joins the room for that multisig account (transaction events scoped to it)
- **Switch account room at runtime**: emit \`join:account\` with the new account address.

Events emitted by the server:

| Event | Payload | When |
|---|---|---|
| \`tx:created\` | \`{ id, accountAddress, status, ... }\` | New transaction proposed |
| \`tx:voted\` | \`{ id, voterCommitment, approve }\` | A signer approved or denied |
| \`tx:status\` | \`{ id, status, txHash?, error? }\` | Lifecycle: PENDING → EXECUTING → EXECUTED / FAILED |
| \`account:created\` | \`Account\` DTO | A new multisig account was created |

You only receive events for accounts you are a signer of (room-scoped).
`;

export const EXAMPLE_FLOWS_SECTION = `## Example flows

End-to-end happy paths the agent can use as a template.

### Flow 1 — Login and read your accounts

\`\`\`http
POST /api/auth/login
Content-Type: application/json

{ "commitment": "0x...", "proof": [47, 5, ...], "publicInputs": ["0x084c..."] }
\`\`\`

Response:
\`\`\`json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
\`\`\`

Then:
\`\`\`http
GET /api/accounts
Authorization: Bearer <accessToken>
\`\`\`

### Flow 2 — Multi-sig transfer (Horizen or Base)

1. Creator proposes a transfer (auto-approves with their proof):
   \`\`\`http
   POST /api/transactions
   Authorization: Bearer <accessToken>

   { "accountAddress": "0x...", "type": "TRANSFER", "to": "0x...",
     "value": "1000000", "tokenAddress": "0x...", "proof": [...], "publicInputs": [...] }
   \`\`\`
2. Other signers approve (also a ZK proof):
   \`\`\`http
   POST /api/transactions/:txId/approve
   { "proof": [...], "publicInputs": [...] }
   \`\`\`
   (or \`POST /api/transactions/:txId/deny\` — off-chain vote, no proof needed)
3. When the threshold is met, anyone can execute:
   \`\`\`http
   POST /api/transactions/:txId/execute
   \`\`\`
   The backend aggregates proofs on zkVerify, then executes on the destination chain.
   Watch the \`tx:status\` WebSocket event for live status.

### Flow 3 — Refresh expired token

On any \`401\`:
\`\`\`http
POST /api/auth/refresh
{ "refreshToken": "eyJ..." }
\`\`\`
Returns a new \`accessToken\`. Replay the original request.

### Flow 4 — Gasless USDC deposit on Base (x402, agent-friendly)

Fund a Base multisig with USDC, no PolyPay account, no API key, no ETH.
Designed for AI agents and external scripts via the x402 protocol.

\`\`\`http
GET /api/x402/deposit/{multisigAddress}
\`\`\`
Returns \`402 Payment Required\` with x402 v1 discovery payload (price, asset,
recipient, EIP-3009 domain).

\`\`\`http
POST /api/x402/deposit/{multisigAddress}
X-PAYMENT: <base64 EIP-3009 authorization>
\`\`\`
Facilitator submits the on-chain transfer and pays the gas. Use any standard
x402 client library (no PolyPay-specific SDK required).

> Only multisigs deployed on Base mainnet (\`8453\`) or Base Sepolia (\`84532\`)
> support x402. Horizen multisigs do not.
`;
