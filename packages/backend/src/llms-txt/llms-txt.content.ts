/**
 * Hand-written playbook content for /llms.txt.
 *
 * Audience: AI agents that want to integrate PolyPay via plain HTTP.
 *
 * Why hand-written rather than auto-generated from Swagger:
 *   Agents need step-by-step recipes (not an endpoint dump) and pinned
 *   constants (not pseudocode) — see the ZK proof section. Re-generating
 *   from OpenAPI consistently produced output an agent could read but not
 *   actually act on. Update this file when a flow changes; let Swagger
 *   keep being the source of truth for the long-tail endpoints not covered
 *   here.
 */

const HEADER = `# PolyPay API for AI agents

> PolyPay is a privacy-preserving multi-chain payroll platform. Multisig
> wallets on Horizen (L3) and Base (L2), member privacy via Noir ZK proofs,
> aggregate proof verification via zkVerify on Horizen, and an x402-compliant
> gasless USDC deposit endpoint for AI agents.

This file is a playbook for agents. It covers the 5 most common integration
flows end-to-end with concrete HTTP and TypeScript snippets. The full API
surface is at /swagger and /swagger-json.

All endpoints are mounted under /api unless noted. Base URL examples assume
\`http://localhost:4000\`; swap in your deployment host.

Supported chains (use the matching \`chainId\` for account creation):

| Chain | chainId |
|---|---|
| Horizen mainnet | 26514 |
| Horizen testnet | 2651420 |
| Base mainnet | 8453 |
| Base Sepolia | 84532 |
`;

const OVERVIEW_SECTION = `## Overview

| Flow | Auth required? | ZK proof required? | Difficulty |
|---|---|---|---|
| 1. Login | No (this IS auth) | Yes (auth proof) | Medium |
| 2. Create multisig account | JWT | No | Easy |
| 3. Single transfer | JWT | Yes (vote proof) | Hard |
| 4. Batch transfer | JWT | Yes (vote proof) | Hard |
| 5. Gasless USDC deposit (x402) | No | No | Easy |

If your agent only needs to *send* USDC to a known multisig, skip to flow
5 — it requires no PolyPay account, no JWT, and no ZK setup.

Read-only endpoints (GET /api/accounts/:address, GET /api/transactions, ...)
work the same way: authenticate with JWT, then GET. They are not detailed
here because they have no surprising shape — see /swagger.
`;

const AUTH_SECTION = `## Authentication

After flow 1 (Login) you hold an \`accessToken\` (~15 min lifetime) and a
\`refreshToken\` (~7 day lifetime). Pass the access token on every protected
endpoint:

\`\`\`http
Authorization: Bearer <accessToken>
\`\`\`

On 401, call \`POST /api/auth/refresh\` with \`{ refreshToken }\` to mint a
new pair. If both expire, repeat flow 1.

Identity primitives (all client-side):

- **secret** — \`keccak256(wallet.signMessage("noir-identity")) % BN254_MODULUS\`
- **commitment** — \`poseidonHash2(secret, secret)\` — public, used as your
  user ID across the system
- **signer wallet** — any standard secp256k1 EOA; it never holds funds, it
  only derives your secret

Keep \`secret\` private; it grants full control over every multisig you sign for.
`;

const FLOW_1_LOGIN = `## Flow 1 — Login

\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "commitment": "21888242871...",       // decimal string
  "proof": [47, 5, 211, ...],            // byte array, auth proof
  "publicInputs": ["0x084c...", ...],    // hex-encoded BN254 field elements
  "vk": "0x..."                          // verification key (hex)
}
\`\`\`

Response:

\`\`\`json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
\`\`\`

The auth proof is *separate* from the vote proof in flows 3 and 4. It uses
a smaller circuit (\`auth-circuit.json\`) that only proves you know the
preimage of \`commitment\`. See the "Generating a ZK proof" section below.
`;

const FLOW_2_CREATE_ACCOUNT = `## Flow 2 — Create a multisig account

After login. No ZK proof here — the contract is just deployed with the
signers' commitments embedded.

Each other signer derives their own \`secret\` and \`commitment\` the same
way the caller does. You obtain their \`commitment\` (a decimal string) out
of band before account creation.

**Constraint: the caller's own \`commitment\` MUST appear in the \`signers\`
array, otherwise the server returns 400 "Creator must be in signers list".**
Threshold must also be \`<= signers.length\`.

\`\`\`http
POST /api/accounts
Authorization: Bearer <accessToken>

{
  "name": "Acme Payroll",
  "threshold": 2,
  "chainId": 8453,
  "signers": [
    { "commitment": "<callerCommitment>", "name": "Alice" },
    { "commitment": "<bobCommitment>",    "name": "Bob"   }
  ]
}
\`\`\`

\`signers[i]\` has exactly two fields: \`commitment\` (required) and \`name\`
(optional). Any other field is rejected — the validator runs in strict mode.

Response (subset; see /swagger for full shape):

\`\`\`json
{
  "id": "clxxx...",
  "address": "0xMultisigContractAddress",
  "chainId": 8453,
  "threshold": 2,
  "contractVersion": 1,
  "name": "Acme Payroll",
  "signers": [/* ... */]
}
\`\`\`

After this returns, fund the multisig by sending ETH/USDC to \`address\`
the normal way, or use flow 5 (x402) if the funder is an agent.
`;

const FLOW_3_SINGLE = `## Flow 3 — Single transfer (propose → approve → execute)

Creator and one other signer must each generate a ZK proof. The flow takes
three signer-side HTTP calls plus one final execute call from any signer.

### 3a. Reserve a nonce

\`\`\`http
POST /api/transactions/reserve-nonce
Authorization: Bearer <creatorAccessToken>

{ "accountAddress": "0xMultisig" }
\`\`\`

Response: \`{ "nonce": 7, "expiresAt": "2026-05-11T12:34:56.000Z" }\`

The reservation expires after a short TTL — use it in step 3d promptly. If
it expires, the create call returns 400 and you must reserve again.

### 3b. Compute txHash (client-side)

Build (to, value, data). For ERC-20:

\`\`\`ts
import { encodeFunctionData } from "viem";

const transferData = encodeFunctionData({
  abi: [{ name: "transfer", type: "function", stateMutability: "nonpayable",
          inputs: [{ name: "to", type: "address" },
                   { name: "amount", type: "uint256" }],
          outputs: [{ type: "bool" }] }],
  functionName: "transfer",
  args: [recipient, amountSmallestUnit],
});

const to = tokenAddress;            // for native ETH: the recipient instead
const value = 0n;                   // for native ETH: amount in wei
const data = transferData;          // for native ETH: "0x"
\`\`\`

Then compute the hash. Preferred: call the multisig contract's view
function (zero risk of encoding errors):

\`\`\`ts
import { createPublicClient, http } from "viem";
const client = createPublicClient({ transport: http(rpcUrl) });
const txHash = await client.readContract({
  address: multisigAddress,
  abi: [{ name: "getTransactionHash", type: "function", stateMutability: "view",
          inputs: [{ name: "_nonce", type: "uint256" },
                   { name: "to", type: "address" },
                   { name: "value", type: "uint256" },
                   { name: "data", type: "bytes" }],
          outputs: [{ type: "bytes32" }] }],
  functionName: "getTransactionHash",
  args: [BigInt(nonce), to, value, data],
});
\`\`\`

Fallback (no RPC): compute locally with the same packing the contract
uses. \`chainId\` here is the value the multisig was deployed with; fetch it
via \`GET /api/accounts/:address\` if you do not already know it.

\`\`\`ts
import { keccak256, encodePacked } from "viem";

const txHash = keccak256(encodePacked(
  ["address", "uint256", "uint256", "address", "uint256", "bytes"],
  [multisigAddress, BigInt(chainId), BigInt(nonce), to, value, data],
));
\`\`\`

For batch see flow 4.

### 3c. Generate vote proof (creator)

See "Generating a ZK proof" section. Inputs: signer wallet, secret, txHash.

### 3d. Create the transaction

\`\`\`http
POST /api/transactions
Authorization: Bearer <creatorAccessToken>

{
  "nonce": 7,
  "type": "TRANSFER",
  "accountAddress": "0xMultisig",
  "to": "0xRecipient",
  "value": "1000000",                    // amount in smallest unit (decimal string)
  "tokenAddress": "0xUSDC",              // omit for native ETH/ZEN
  "threshold": 2,
  "proof": [/* number[] */],
  "publicInputs": ["...", "...", "..."],
  "nullifier": "...",
  "vk": "0x..."
}
\`\`\`

Response (subset): \`{ "txId": 42, "nonce": 7, "status": "PENDING", ... }\`.
The transaction is now PENDING with 1 vote (auto-recorded for the creator).

### 3e. Second signer approves

Second signer fetches the tx to learn (nonce, to, value, data), recomputes
the same txHash, generates *their* proof (with their secret), and POSTs:

\`\`\`http
POST /api/transactions/42/approve
Authorization: Bearer <signerBAccessToken>

{
  "proof": [...],
  "publicInputs": [...],
  "nullifier": "...",
  "vk": "0x..."
}
\`\`\`

### 3f. Execute

Once \`votes.length >= threshold\`, anyone (any signer) can execute:

\`\`\`http
POST /api/transactions/42/execute
Authorization: Bearer <anySignerAccessToken>

{}
\`\`\`

The body may be \`{}\` or \`{ "userAddress": "0x..." }\` (optional, used for
analytics). The backend aggregates the proofs on zkVerify (Horizen) or
submits directly (Base), then calls \`execute(...)\` on the multisig
contract. Poll \`GET /api/transactions/42\` for the final status. Terminal
states: \`EXECUTED\`, \`EXECUTION_FAILED\`, \`PROOF_FAILED\`.

Reject path: \`POST /api/transactions/42/deny\` with body \`{}\` (or
\`{ "userAddress": "0x..." }\`). No proof needed — it's an off-chain vote
that blocks execution.
`;

const FLOW_4_BATCH = `## Flow 4 — Batch transfer

Same shape as flow 3, but \`to\` is the multisig itself and \`data\` is a
call into the multisig's \`batchTransferMulti\` function.

### 4a. Stage batch items

For each line of the batch, POST to /api/batch-items. These are persistent
client-side state; you can build the batch over time before proposing.

\`\`\`http
POST /api/batch-items
Authorization: Bearer <creatorAccessToken>

{
  "recipient": "0xAlice",
  "amount": "5000000",                   // smallest unit
  "tokenAddress": "0xUSDC"               // omit for native
}
\`\`\`

Response: \`{ "id": "clxxxx..." }\`. Save these IDs.

### 4b. Compute batch call data

\`\`\`ts
import { encodeFunctionData } from "viem";

const batchAbi = [{
  name: "batchTransferMulti", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "recipients", type: "address[]" },
    { name: "amounts", type: "uint256[]" },
    { name: "tokenAddresses", type: "address[]" },
  ],
  outputs: [],
}];

const data = encodeFunctionData({
  abi: batchAbi,
  functionName: "batchTransferMulti",
  args: [
    recipients,                          // address[]
    amounts,                             // bigint[]
    tokenAddresses,                      // address[]; use 0x0 for native
  ],
});

const to = multisigAddress;              // self-call
const value = 0n;
\`\`\`

### 4c. Reserve nonce, compute txHash, generate proof, POST

Identical to flow 3, but the create call carries \`type: "BATCH"\` and the
list of batch item IDs:

\`\`\`http
POST /api/transactions
Authorization: Bearer <creatorAccessToken>

{
  "nonce": <reserved>,
  "type": "BATCH",
  "accountAddress": "0xMultisig",
  "to": "0xMultisig",                    // self
  "value": "0",
  "threshold": 2,
  "proof": [...],
  "publicInputs": [...],
  "nullifier": "...",
  "vk": "0x...",
  "batchItemIds": ["clxxx1", "clxxx2", "clxxx3"]
}
\`\`\`

Approve + execute steps are identical to flow 3.
`;

const FLOW_5_X402 = `## Flow 5 — Gasless USDC deposit (x402)

This is the *one* write-side endpoint that is fully agent-friendly: no
PolyPay account, no JWT, no ZK proof. Use it when an external agent (or
human) wants to fund an existing PolyPay multisig with USDC on Base.

It implements the [x402 protocol](https://x402.org).

### 5a. Discover payment requirements

\`\`\`http
GET /api/x402/deposit/0xMultisig
\`\`\`

Returns HTTP 402 with the x402 payload. Full shape from the live backend:

\`\`\`json
{
  "accepts": [{
    "scheme": "exact",
    "network": "base",                                         // or "base-sepolia"
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",   // USDC on Base mainnet
    "payTo": "0xMultisig",
    "maxAmountRequired": "10000000000",                        // upper bound: 10000 USDC
    "resource": "https://<host>/api/x402/deposit/0xMultisig",
    "description": "Gasless USDC deposit to PolyPay multisig 0xMultisig. Sign EIP-3009 transferWithAuthorization for any amount in [1000000, 10000000000] (6-decimals USDC).",
    "mimeType": "application/json",
    "maxTimeoutSeconds": 120,
    "extra": {
      "name": "USD Coin",
      "version": "2",
      "minDeposit": "1000000",                                 // 1 USDC
      "maxDeposit": "10000000000"                              // 10,000 USDC
    }
  }]
}
\`\`\`

Deposit amount in step 5b must be within \`[extra.minDeposit, extra.maxDeposit]\`
(both 6-decimals USDC integers). Outside that range, settle fails.

### 5b. Sign EIP-3009 authorization with your USDC-holding wallet

\`\`\`ts
const auth = {
  from: agentWallet.address,
  to: payTo,
  value: amount,                                  // bigint, within [minDeposit, maxDeposit]
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 120,  // match maxTimeoutSeconds
  nonce: \`0x\${crypto.randomBytes(32).toString("hex")}\`,
};

const signature = await agentWallet.signTypedData({
  domain: {
    name: "USD Coin", version: "2", chainId: 8453,
    verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: auth,
});

// Build X-PAYMENT header per x402 v1 spec.
const payload = {
  x402Version: 1,
  scheme: "exact",
  network: "base",
  payload: { authorization: auth, signature },
};
const xPayment = Buffer.from(JSON.stringify(payload)).toString("base64");
\`\`\`

### 5c. Submit payment

\`\`\`http
POST /api/x402/deposit/0xMultisig
X-PAYMENT: <base64 payload from 5b>
Content-Type: application/json

{ "memo": "salary cycle 2026-05" }
\`\`\`

Body is optional: \`{}\` works; \`memo\` (string, max 280 chars) is stored
alongside the deposit record for accounting.

Successful response (200):

\`\`\`json
{
  "principalTxHash": "0xabc...",
  "multisigAddress": "0xMultisig",
  "depositedAmount": "1000000",
  "chainId": 8453
}
\`\`\`

The PolyPay facilitator submits the on-chain transfer and pays gas. You pay
nothing extra (USDC moves from your wallet to the multisig at face value).

Errors come back with HTTP 4xx and a \`message\` field; \`Retry-After\` on 429.
`;

const ZK_PROOF_SECTION = `## Generating a ZK proof

**Required for flows 1, 3, 4.** Skip if you only use flow 2 and 5.

The constants and library choices below are load-bearing — using any other
Poseidon variant, field, or library produces proofs that pass local
witness execution but fail on-chain verification. Pin exactly:

\`\`\`ts
// BN254 scalar field modulus — the field Noir programs operate over.
export const BN254_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Poseidon-BN254 width=3 (PoseidonT3, x^5 S-box) from circomlibjs.
// DO NOT substitute Penumbra/Aragon/iden3 parameter sets — they produce
// different digests for the same inputs.
import { buildPoseidon } from "circomlibjs";

let poseidonInstance: any = null;
async function getPoseidon() {
  if (!poseidonInstance) poseidonInstance = await buildPoseidon();
  return poseidonInstance;
}

export async function poseidonHash2(a: bigint, b: bigint): Promise<bigint> {
  const poseidon = await getPoseidon();
  // Always reduce inputs into the field before hashing.
  const safeInputs = [a % BN254_MODULUS, b % BN254_MODULUS];
  const hash = poseidon(safeInputs);
  return BigInt(poseidon.F.toString(hash));
}
\`\`\`

### Deriving identity

\`\`\`ts
import { keccak256 } from "viem";

const sig = await wallet.signMessage({ message: "noir-identity" });
const secret = BigInt(keccak256(sig)) % BN254_MODULUS;
const commitment = await poseidonHash2(secret, secret);
\`\`\`

### Vote proof (for flows 3 and 4)

There is one subtlety that bites every agent: when you sign a 32-byte
\`txHash\` via viem's \`signMessage({ message: { raw } })\`, **viem applies
the EIP-191 prefix internally** (\`"\\x19Ethereum Signed Message:\\n32" || txHash\`).
That means the signature is over \`hashMessage({ raw: txHash })\`, not over
\`txHash\`. Public-key recovery must use the same prefixed hash, and that is
what the Noir circuit expects to verify.

\`\`\`ts
import { hashMessage, hexToBytes, recoverPublicKey } from "viem";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";

// The compiled vote circuit. Two ways to get it:
//   * Fetch from your deployment: GET /circuit/target/circuit.json
//   * Or vendor a copy alongside your agent code (recommended for offline).
import circuit from "./circuit.json";

export async function generateVoteProof(
  wallet: { signMessage: (m: { message: { raw: \`0x\${string}\` } }) => Promise<\`0x\${string}\`> },
  secret: bigint,
  txHash: \`0x\${string}\`,
) {
  // 1. Sign txHash. viem prepends the EIP-191 prefix automatically.
  const signature = await wallet.signMessage({ message: { raw: txHash } });

  // 2. Recover the public key from the SAME EIP-191-prefixed hash. Passing
  //    txHash directly here yields the wrong key — agents commonly miss this.
  const prefixedHash = hashMessage({ raw: txHash });
  const pubKeyHex = await recoverPublicKey({ hash: prefixedHash, signature });

  // pubKeyHex is uncompressed: 0x04 || X(32 bytes) || Y(32 bytes) = 65 bytes total.
  const pubKeyBytes = hexToBytes(pubKeyHex);
  const pubKeyX = Array.from(pubKeyBytes.slice(1, 33));
  const pubKeyY = Array.from(pubKeyBytes.slice(33, 65));

  // 3. Derive commitment and nullifier.
  const commitment = await poseidonHash2(secret, secret);
  const txHashField = BigInt(txHash) % BN254_MODULUS;
  const nullifier = await poseidonHash2(secret, txHashField);

  // 4. tx-hash commitment that the circuit checks against the public input.
  const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);

  // 5. Circuit inputs. Field names must match circuit.abi EXACTLY. The
  //    \`tx_hash_bytes\` field is the raw txHash (32 bytes), not the
  //    EIP-191-prefixed hash.
  const txHashBytes = Array.from(hexToBytes(txHash));
  const sigBytes = Array.from(hexToBytes(signature)).slice(0, 64); // strip the v byte

  const circuitInputs = {
    signature: sigBytes,
    pub_key_x: pubKeyX,
    pub_key_y: pubKeyY,
    secret: secret.toString(),
    tx_hash_bytes: txHashBytes,
    tx_hash_commitment: txHashCommitment.toString(),
    commitment: commitment.toString(),
    nullifier: nullifier.toString(),
  };

  const noir = new Noir(circuit as never);
  const { witness } = await noir.execute(circuitInputs);

  // 6. UltraHonk proof with keccak transcript — required to match the
  //    on-chain verifier deployed by PolyPay.
  const backend = new UltraHonkBackend(circuit.bytecode);
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  const rawVk = await backend.getVerificationKey({ keccak: true });
  const vk = "0x" + Buffer.from(rawVk).toString("hex");

  return {
    proof: Array.from(proof),            // number[]
    publicInputs,                        // string[]
    nullifier: nullifier.toString(),
    vk,                                  // "0x..."
  };
}
\`\`\`

### Auth proof (for flow 1)

The auth circuit only proves \`commitment == poseidonHash2(secret, secret)\` —
no signature involved.

\`\`\`ts
import authCircuit from "./auth-circuit.json";  // GET /auth-circuit/target/circuit.json

export async function generateAuthProof(secret: bigint) {
  const commitment = await poseidonHash2(secret, secret);
  const inputs = { secret: secret.toString(), commitment: commitment.toString() };

  const noir = new Noir(authCircuit as never);
  const { witness } = await noir.execute(inputs);
  const backend = new UltraHonkBackend(authCircuit.bytecode);
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  const rawVk = await backend.getVerificationKey({ keccak: true });
  return {
    proof: Array.from(proof),
    publicInputs,
    vk: "0x" + Buffer.from(rawVk).toString("hex"),
  };
}
\`\`\`

### Where to get the circuits

Both compiled circuits are served by the PolyPay frontend at predictable
runtime paths:

- Vote circuit: \`https://<frontend-host>/circuit/target/circuit.json\`
- Auth circuit: \`https://<frontend-host>/auth-circuit/target/circuit.json\`

(\`<frontend-host>\` is the deployment URL of \`packages/nextjs\`; for local
development that is \`http://localhost:3000\`.) Vendor the two JSON files
alongside your agent code if you cannot fetch URLs at runtime.

### Common failure modes

- Substituted a different Poseidon variant → proof generates, fails on
  chain. Stick to \`circomlibjs.buildPoseidon\`.
- Recovered the public key from \`txHash\` instead of
  \`hashMessage({ raw: txHash })\` → wrong key → circuit witness execution
  fails. This is the most common bug.
- Forgot \`{ keccak: true }\` on \`generateProof\` and/or
  \`getVerificationKey\` → wrong transcript → on-chain verifier rejects.
- Sent \`vk\` in base64 instead of \`0x\`-hex → backend returns 400.
- Reused a nullifier across two votes for the same proposal → contract
  rejects on \`execute\`.
`;

const ERRORS_SECTION = `## Errors and rate limits

NestJS error envelope:

\`\`\`json
{ "statusCode": 400, "message": "Validation failed" | ["field must be a string"], "error": "Bad Request" }
\`\`\`

Common codes:

- \`400\` validation, \`401\` missing/expired JWT (refresh), \`403\` not a
  signer, \`404\` not found, \`409\` duplicate vote / already executed,
  \`429\` rate-limited (respect \`Retry-After\`), \`5xx\` retry with backoff.

ZK endpoints return 201 immediately; the proof verdict arrives asynchronously
on-chain. Poll \`GET /api/transactions/:id\` and watch for terminal status
\`PROOF_FAILED\` or \`EXECUTION_FAILED\`.

Throttle is per-IP, 60-second window:

| Endpoint | Limit / minute |
|---|---|
| Default | 60 |
| \`POST /api/auth/login\` | 5 |
| \`POST /api/auth/refresh\` | 30 |
| \`POST /api/transactions\` | 10 |
| \`POST /api/transactions/:id/approve\` | 10 |
| \`POST /api/transactions/:id/deny\` | 20 |
| \`POST /api/transactions/:id/execute\` | 5 |
| \`POST /api/transactions/reserve-nonce\` | 10 |
| \`GET /api/x402/deposit/:address\` | 60 |
| \`POST /api/x402/deposit/:address\` | 10 |
`;

export function buildLlmsTxt(): string {
  return [
    HEADER,
    OVERVIEW_SECTION,
    AUTH_SECTION,
    FLOW_1_LOGIN,
    FLOW_2_CREATE_ACCOUNT,
    FLOW_3_SINGLE,
    FLOW_4_BATCH,
    FLOW_5_X402,
    ZK_PROOF_SECTION,
    ERRORS_SECTION,
  ]
    .map((s) => s.trim())
    .join('\n\n')
    .concat('\n');
}
