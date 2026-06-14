#!/usr/bin/env node
// OWS signer subprocess.
//
// The agent's main process never imports the OWS SDK and never sees key
// material. It spawns THIS process, which asks OWS to sign — the private key is
// decrypted inside the vault, used, and wiped, all behind the policy engine.
//
//   node ows-signer.mjs address           -> { "address": "0x..." }   (no token needed)
//   node ows-signer.mjs sign  < stdin     -> { "signature": "0x...", "recoveryId": 27|28 }
//
// stdin for `sign`: { "typedDataJson": "<EIP-712 JSON string>" }
// env: OWS_WALLET (required), OWS_API_KEY (required for `sign`)

import { getWallet, signTypedData } from "@open-wallet-standard/core";

const ARBITRUM = "arbitrum"; // OWS alias for eip155:42161

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function readStdin() {
  return new Promise(resolve => {
    let data = "";
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

const wallet = process.env.OWS_WALLET;
if (!wallet) fail("OWS_WALLET is not set");

const action = process.argv[2];

if (action === "address") {
  const info = getWallet(wallet);
  const evm = info.accounts.find(a => a.chainId.startsWith("eip155:"));
  if (!evm) fail("wallet has no EVM (eip155) account");
  process.stdout.write(JSON.stringify({ address: evm.address }));
  process.exit(0);
} else if (action === "sign") {
  const token = process.env.OWS_API_KEY;
  if (!token) fail("OWS_API_KEY is not set");
  const raw = await readStdin();
  let typedDataJson;
  try {
    ({ typedDataJson } = JSON.parse(raw));
  } catch {
    fail("invalid signer stdin: expected JSON { typedDataJson }");
  }
  if (typeof typedDataJson !== "string") fail("typedDataJson must be a JSON string");
  // Passing the ows_key_ token where the passphrase goes triggers agent mode:
  // OWS evaluates every attached policy BEFORE the key is decrypted.
  const res = signTypedData(wallet, ARBITRUM, typedDataJson, token);
  process.stdout.write(JSON.stringify({ signature: res.signature, recoveryId: res.recoveryId }));
  process.exit(0);
} else {
  fail(`unknown action: ${action ?? "(none)"} — expected "address" or "sign"`);
}
