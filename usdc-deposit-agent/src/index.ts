import { randomBytes } from "node:crypto";
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  parseUnits,
  recoverTypedDataAddress,
  type Hex,
} from "viem";
import { arbitrum } from "viem/chains";
import { OwsSigner } from "./owsSigner.js";

const CHAIN_ID = 42161;
const USDC_FALLBACK = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
// The v1 X-PAYMENT payload `network` the backend checks is the facilitator label
// (`chainIdToFacilitatorNetwork(42161)` === "arbitrum"), NOT discovery's CAIP-2
// `network` ("eip155:42161"). Sending the CAIP-2 form fails the equality check.
const FACILITATOR_NETWORK = "arbitrum";

// EIP-3009 / EIP-712 type definitions (must match the USDC contract + PolyPay).
const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

const EIP712_DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const USDC_READ_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "version", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

function env(name: string, required = true): string {
  const v = process.env[name]?.trim();
  if (!v && required) {
    console.error(`✖ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v ?? "";
}

function assembleSignature(signature: string, recoveryId: number): Hex {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (hex.length === 130) return `0x${hex}`; // already r||s||v (65 bytes)
  if (hex.length === 128) {
    // r||s (64 bytes) — append v in {27,28}
    const v = recoveryId < 27 ? recoveryId + 27 : recoveryId;
    return `0x${hex}${v.toString(16).padStart(2, "0")}`;
  }
  throw new Error(`Unexpected signature length: ${hex.length} hex chars`);
}

async function main() {
  const apiBase = (process.env.POLYPAY_API_URL?.trim() || "https://api.polypay.pro").replace(/\/$/, "");
  const multisig = getAddress(env("MULTISIG_ADDRESS"));
  const amountStr = env("AMOUNT_USDC");
  const memo = process.env.MEMO?.trim() || "";
  const rpcUrl = process.env.ARBITRUM_RPC_URL?.trim() || "";

  const signer = new OwsSigner({ wallet: env("OWS_WALLET"), apiKey: env("OWS_API_KEY") });

  console.log("→ PolyPay USDC deposit agent (Arbitrum One, gasless x402)");
  const from = getAddress(await signer.getAddress());
  console.log(`  agent wallet : ${from}`);
  console.log(`  multisig     : ${multisig}`);

  // ── 1. Discover payment requirements (HTTP 402) ───────────────────────────
  const depositUrl = `${apiBase}/api/x402/deposit/${multisig}`;
  const disco = await fetch(depositUrl, { headers: { Accept: "application/json" } });
  if (disco.status !== 402) {
    throw new Error(`Expected HTTP 402 from discovery, got ${disco.status}: ${await disco.text()}`);
  }
  const accept = ((await disco.json()) as { accepts?: any[] }).accepts?.[0];
  if (!accept) throw new Error("Discovery response had no `accepts[0]`");

  const usdc = getAddress(accept.asset ?? USDC_FALLBACK);
  const network = FACILITATOR_NETWORK; // payload label the backend validates against
  const payTo = getAddress(accept.payTo ?? multisig);
  if (payTo !== multisig) throw new Error(`payTo ${payTo} != requested multisig ${multisig}`);

  const minDeposit = BigInt(accept.extra?.minDeposit ?? "0");
  const maxDeposit = BigInt(accept.extra?.maxDeposit ?? accept.maxAmountRequired ?? "0");
  const maxTimeout = Number(accept.maxTimeoutSeconds ?? 0);

  // ── 2. Resolve EIP-712 domain (name/version) + amount ─────────────────────
  const publicClient = rpcUrl
    ? createPublicClient({ chain: arbitrum, transport: http(rpcUrl) })
    : undefined;

  let domainName: string | undefined = accept.extra?.name;
  let domainVersion: string | undefined = accept.extra?.version;
  if ((!domainName || !domainVersion) && publicClient) {
    const [n, v] = await Promise.all([
      publicClient.readContract({ address: usdc, abi: USDC_READ_ABI, functionName: "name" }),
      publicClient.readContract({ address: usdc, abi: USDC_READ_ABI, functionName: "version" }),
    ]);
    domainName ??= n as string;
    domainVersion ??= v as string;
  }
  domainName ??= "USD Coin";
  domainVersion ??= "2";

  const value = parseUnits(amountStr, 6);
  if (value <= 0n) throw new Error("AMOUNT_USDC must be positive");
  if (minDeposit > 0n && value < minDeposit)
    throw new Error(`Amount ${formatUnits(value, 6)} below minDeposit ${formatUnits(minDeposit, 6)} USDC`);
  if (maxDeposit > 0n && value > maxDeposit)
    throw new Error(`Amount ${formatUnits(value, 6)} above maxDeposit ${formatUnits(maxDeposit, 6)} USDC`);
  console.log(`  amount       : ${formatUnits(value, 6)} USDC (${value} base units)`);

  // ── 2b. Optional balance pre-flight ───────────────────────────────────────
  if (publicClient) {
    const balance = (await publicClient.readContract({
      address: usdc,
      abi: USDC_READ_ABI,
      functionName: "balanceOf",
      args: [from],
    })) as bigint;
    if (balance < value) {
      throw new Error(
        `Insufficient USDC: wallet holds ${formatUnits(balance, 6)}, needs ${formatUnits(value, 6)} on Arbitrum One`,
      );
    }
  }

  // ── 3. Build EIP-3009 authorization typed data ────────────────────────────
  const validBefore = Math.floor(Date.now() / 1000) + Math.max(maxTimeout, 300);
  const nonce = `0x${randomBytes(32).toString("hex")}` as Hex;
  const message = {
    from,
    to: multisig,
    value: value.toString(),
    validAfter: "0",
    validBefore: String(validBefore),
    nonce,
  };
  const typedData = {
    types: { EIP712Domain: EIP712_DOMAIN_TYPE, ...TRANSFER_WITH_AUTHORIZATION_TYPES },
    primaryType: "TransferWithAuthorization",
    domain: { name: domainName, version: domainVersion, chainId: String(CHAIN_ID), verifyingContract: usdc },
    message,
  };

  // ── 4. Sign via OWS (policy-gated; key never enters this process) ──────────
  console.log("  signing      : via OWS vault (policy-gated)…");
  const { signature, recoveryId } = await signer.signTypedData(JSON.stringify(typedData));
  const sig = assembleSignature(signature, recoveryId);

  // Sanity: recover the signer locally and confirm it matches the vault wallet.
  const recovered = await recoverTypedDataAddress({
    domain: { name: domainName, version: domainVersion, chainId: CHAIN_ID, verifyingContract: usdc },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from,
      to: multisig,
      value,
      validAfter: 0n,
      validBefore: BigInt(validBefore),
      nonce,
    },
    signature: sig,
  });
  if (getAddress(recovered) !== from) {
    throw new Error(`Signature check failed: recovered ${recovered} != wallet ${from}`);
  }

  // ── 5. Submit the x402 v1 payment ─────────────────────────────────────────
  const payload = {
    x402Version: 1,
    scheme: "exact",
    network,
    payload: { signature: sig, authorization: message },
  };
  const xPayment = Buffer.from(JSON.stringify(payload)).toString("base64");

  console.log("  submitting   : POST x402 deposit…");
  const submit = await fetch(depositUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PAYMENT": xPayment },
    body: JSON.stringify(memo ? { memo } : {}),
  });
  const text = await submit.text();
  if (!submit.ok) throw new Error(`Deposit failed (${submit.status}): ${text}`);

  const result = JSON.parse(text);
  console.log("\n✓ Deposit settled");
  console.log(`  tx hash      : ${result.principalTxHash ?? "(none returned)"}`);
  console.log(`  deposited    : ${result.depositedAmount ? formatUnits(BigInt(result.depositedAmount), 6) : amountStr} USDC`);
  console.log(`  multisig     : ${result.multisigAddress ?? multisig}`);
}

main().catch(err => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
