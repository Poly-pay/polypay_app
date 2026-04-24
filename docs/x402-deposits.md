# Gasless USDC Deposits (x402)

PolyPay supports the [x402 payment protocol](https://www.x402.org/) for funding multisig accounts on Base without holding ETH. The depositor signs a single off-chain authorization; an x402 facilitator submits the on-chain transfer and pays the gas.

## What is x402 deposit?

x402 is an open HTTP-native payment standard (HTTP 402 + EIP-3009 stablecoin transfer) designed for both human users and AI agents. PolyPay exposes a public x402-compliant endpoint per multisig: anyone with USDC on Base can fund a PolyPay multisig in a single signature, with zero gas, no API key, and no PolyPay account.

Same endpoint, two audiences:

- **Human users** open the Portfolio panel of any Base multisig in the PolyPay app and click **Deposit** — one wallet signature funds the multisig.
- **AI agents and external scripts** call the endpoint with any standard x402 client library — autonomous, programmatic, ecosystem-compatible.

## For users

### Prerequisites

- A wallet (MetaMask, Coinbase Wallet, Rainbow, etc.) connected to **Base mainnet** or **Base Sepolia**.
- USDC in the wallet (≥ 1 USDC).
- A PolyPay multisig deployed on Base mainnet or Base Sepolia.

> No ETH required. The facilitator pays the on-chain gas.

### Flow

1. Open the PolyPay app and select your Base multisig.
2. Click the **Portfolio** in the top-right to open the drawer.
3. In the action row (Transfer / Receive / Deposit), click **Deposit**.
4. Enter an amount between **1 and 10,000 USDC**.
5. Click **Deposit** and approve the wallet signature prompt (one signature, off-chain).
6. The success screen displays a Basescan transaction link. The USDC arrives in the multisig within seconds.

If your wallet is connected to a different chain than the multisig, the modal shows a "Switch network" prompt.

## For agents and developers

### Endpoint

```
GET  /api/x402/deposit/{multisigAddress}   → 402 Payment Required + x402 v1 discovery
POST /api/x402/deposit/{multisigAddress}   → 200 OK + on-chain settlement receipt
```

`{multisigAddress}` is the EVM address of a registered PolyPay multisig on Base mainnet (8453) or Base Sepolia (84532). Lookup is case-insensitive.

### Request

POST body is optional metadata only:

```json
{ "memo": "treasury top-up" }   // memo ≤ 280 chars, body may also be {}
```

The actual payment is in the `X-PAYMENT` header — a base64-encoded x402 v1 payment payload (signed EIP-3009 `transferWithAuthorization` from the agent's wallet to the multisig).

### Response

```json
{
  "principalTxHash": "0xabc...",
  "multisigAddress": "0x...",
  "depositedAmount": "1000000",
  "chainId": 8453,
  "status": "SETTLED",
  "timestamp": "2026-04-24T10:30:00.000Z"
}
```

Amount is in 6-decimal USDC base units (`1000000` = 1 USDC).

### Quickstart with `x402-fetch` (TypeScript)

```ts
import { wrapFetchWithPayment } from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const fetchWithPay = wrapFetchWithPayment(fetch, account);

const res = await fetchWithPay(
  "https://api.polypay.xyz/api/x402/deposit/0xYOUR_POLYPAY_MULTISIG",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memo: "agent run" }),
  },
);

const { principalTxHash, status } = await res.json();
console.log(status, principalTxHash);
```

The `x402-fetch` library handles discovery, signing, and the X-PAYMENT header automatically. Equivalent libraries exist for Python (`x402`), Rust (`x402-rs`), and Axios (`x402-axios`).

### Raw protocol (curl)

```bash
# 1. Discovery
curl https://api.polypay.xyz/api/x402/deposit/0xMULTISIG

# 2. Sign EIP-3009 with your wallet (off-chain)
# 3. POST with X-PAYMENT header
curl -X POST https://api.polypay.xyz/api/x402/deposit/0xMULTISIG \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64-x402-v1-payload>" \
  -d '{}'
```

## Supported networks and limits

| Network | Chain ID | USDC contract |
|---|---|---|
| Base mainnet | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | 84532 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

| Limit | Value |
|---|---|
| Minimum deposit | 1 USDC |
| Maximum deposit | 10,000 USDC |
| Per IP, GET discovery | 60 req / 60s |
| Per IP, POST deposit | 10 req / 60s |
| Per multisig, POST deposit | 30 req / 60s |
| Authorization validity | 5 minutes |

## Security model

The x402 deposit endpoint is non-custodial. PolyPay never holds the USDC and never has the authority to redirect it.

- **Recipient is locked**: the EIP-3009 signature binds the transfer to the exact `to = multisigAddress`. Neither PolyPay nor the facilitator can submit the transfer to a different address — the USDC contract verifies the signed recipient on-chain.
- **Amount is locked**: `value` is part of the signed message. No party can inflate or reduce the deposit.
- **Replay protection**: each signature uses a unique 32-byte nonce. The USDC contract marks the nonce consumed on settlement; PolyPay also tracks nonces in its own DB to fail fast on duplicates.
- **No ETH custody**: the facilitator pays gas from its own wallet. PolyPay's relayer wallet is not involved in this flow.

The worst-case behaviour of a malicious or failed facilitator is denial of service — a deposit may fail and need to be retried, but funds cannot be stolen or redirected.

## FAQ

**Why is there no platform fee?**
The marketing value is the x402 listing and the gasless UX, not fee revenue. The facilitator absorbs the on-chain gas; PolyPay subsidises an effectively zero per-deposit cost.

**Which facilitator do you use?**
PolyPay defaults to [PayAI](https://facilitator.payai.network), an x402-compliant facilitator that supports both Base mainnet and Base Sepolia and requires no API key. The facilitator URL is configurable through a single environment variable, so PolyPay can switch to Coinbase CDP, Treasure, Primer, or any other x402-spec facilitator without code changes.

**Can the facilitator steal my USDC?**
No. The signed authorization locks both the recipient and the amount. The facilitator can only submit the transaction as signed; it cannot redirect funds.

**What if the facilitator is down?**
The deposit attempt fails and the user can retry — either later when the facilitator recovers, or PolyPay can switch facilitator via configuration. No funds are lost; the on-chain authorization is not consumed unless settlement succeeds.

**Does this work on Horizen?**
No. x402 currently targets EVM chains supported by facilitators (predominantly Base, Polygon, Solana). On Horizen, deposit funds via direct on-chain `USDC.transfer` from a wallet holding native gas.

**Is this for humans or for agents?**
Both. The same endpoint serves the in-app Deposit modal and any external x402 client.

## See also

- [API Documentation](developer-documentation/api-documentation.md) — full endpoint reference
- [How to use PolyPay App](how-to-use-polipay-app.md) — end-user guide
- [x402 Protocol Specification](https://www.x402.org/) — official protocol docs
- [PayAI Facilitator](https://facilitator.payai.network) — default facilitator used by PolyPay
