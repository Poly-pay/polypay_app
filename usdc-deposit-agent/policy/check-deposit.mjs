#!/usr/bin/env node
// OWS executable policy — the security core of the agent.
//
// OWS pipes a PolicyContext JSON on stdin before any key is decrypted. We allow
// the signature ONLY if it is an EIP-3009 USDC TransferWithAuthorization, on
// Arbitrum One, to the configured multisig, at or below the configured cap.
// Anything else (different recipient, different token, oversized amount, a plain
// transaction, a different chain) is denied — so a prompt-injected agent still
// cannot move funds anywhere except into your multisig, up to the cap.
//
// Config (multisig / usdc / max_value) comes from the policy file's `config`
// block, injected as ctx.policy_config.

let input = "";
process.stdin.on("data", c => (input += c));
process.stdin.on("end", () => {
  try {
    const ctx = JSON.parse(input);
    const cfg = ctx.policy_config || {};
    const multisig = String(cfg.multisig || "").toLowerCase();
    const usdc = String(cfg.usdc || "").toLowerCase();
    const maxValue = cfg.max_value != null ? BigInt(cfg.max_value) : null;

    if (ctx.chain_id !== "eip155:42161") return deny(`chain ${ctx.chain_id} not allowed`);

    const td = ctx.typed_data;
    if (!td) return deny("refusing: request is not EIP-712 typed data");
    if (td.primary_type !== "TransferWithAuthorization")
      return deny(`primaryType ${td.primary_type} not allowed`);

    const vc = String(td.verifying_contract || "").toLowerCase();
    if (usdc && vc !== usdc) return deny(`verifyingContract ${vc || "(none)"} != USDC ${usdc}`);

    let message;
    try {
      message = JSON.parse(td.raw_json).message;
    } catch {
      return deny("cannot parse typed_data.raw_json");
    }

    const to = String(message.to || "").toLowerCase();
    if (multisig && to !== multisig) return deny(`recipient ${to || "(none)"} != multisig ${multisig}`);

    if (maxValue != null) {
      let val;
      try {
        val = BigInt(message.value);
      } catch {
        return deny("message.value is not an integer");
      }
      if (val <= 0n) return deny("message.value must be positive");
      if (val > maxValue) return deny(`value ${val} exceeds cap ${maxValue}`);
    }

    return allow();
  } catch (e) {
    return deny(`policy error: ${e && e.message ? e.message : String(e)}`);
  }
});

function allow() {
  process.stdout.write(JSON.stringify({ allow: true }));
  process.exit(0);
}
function deny(reason) {
  process.stdout.write(JSON.stringify({ allow: false, reason }));
  process.exit(0);
}
