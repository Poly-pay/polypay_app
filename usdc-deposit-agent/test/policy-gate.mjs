// Isolated end-to-end test of the OWS vault → policy → sign path. No real funds.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { importWalletPrivateKey, createPolicy, createApiKey, signTypedData } from "@open-wallet-standard/core";

const vault = mkdtempSync(join(tmpdir(), "ows-smoke-"));
const pass = "testpass";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const MULTISIG = "0x1111111111111111111111111111111111111111";
const CHECK = resolve("policy/check-deposit.mjs");
// anvil account #0
const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const FROM = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function td(to, value, chainId = "42161") {
  return JSON.stringify({
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
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
    domain: { name: "USD Coin", version: "2", chainId, verifyingContract: USDC },
    message: {
      from: FROM,
      to,
      value,
      validAfter: "0",
      validBefore: "99999999999",
      nonce: "0x" + "ab".repeat(32),
    },
  });
}

const results = [];
function run(label, chain, typedData, expectAllow) {
  try {
    const r = signTypedData("smoke-wallet", chain, typedData, token, undefined, vault);
    results.push([label, expectAllow ? "PASS" : "FAIL (should have denied)", r.signature.slice(0, 14) + "…"]);
  } catch (e) {
    const denied = String(e.message || e);
    results.push([label, !expectAllow ? "PASS" : "FAIL (should have signed)", denied.slice(0, 80)]);
  }
}

let token;
try {
  importWalletPrivateKey("smoke-wallet", PK, pass, vault);
  createPolicy(
    JSON.stringify({
      id: "arbitrum-usdc-deposit",
      name: "smoke",
      version: 1,
      created_at: "2026-06-13T00:00:00Z",
      rules: [
        { type: "allowed_chains", chain_ids: ["eip155:42161"] },
        { type: "expires_at", timestamp: "2030-01-01T00:00:00Z" },
      ],
      executable: CHECK,
      config: { multisig: MULTISIG, usdc: USDC, max_value: "100000000" },
      action: "deny",
    }),
    vault,
  );
  const key = createApiKey("agent", ["smoke-wallet"], ["arbitrum-usdc-deposit"], pass, undefined, vault);
  token = key.token;

  run("✔ correct deposit (1 USDC → multisig)", "arbitrum", td(MULTISIG, "1000000"), true);
  run("✘ wrong recipient", "arbitrum", td("0x2222222222222222222222222222222222222222", "1000000"), false);
  run("✘ over the cap (200 USDC)", "arbitrum", td(MULTISIG, "200000000"), false);
  run("✘ wrong chain (base)", "base", td(MULTISIG, "1000000"), false);
} finally {
  rmSync(vault, { recursive: true, force: true });
}

console.log("\nPolicy gate results:");
for (const [label, verdict, detail] of results) console.log(`  [${verdict}] ${label}\n        ${detail}`);
const failed = results.filter(r => r[1].startsWith("FAIL"));
process.exit(failed.length ? 1 : 0);
