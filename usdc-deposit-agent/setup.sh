#!/usr/bin/env bash
# One-time setup: render the policy for YOUR multisig + cap, register it in OWS,
# and mint a scoped agent token. Does NOT touch your private key — you import
# that yourself (see step 1 in the README) so the key never passes through here.
set -euo pipefail

cd "$(dirname "$0")"

# ── Config (override via env) ──────────────────────────────────────────────
WALLET="${OWS_WALLET:-agent-treasury}"          # vault wallet name (must already exist)
MULTISIG="${MULTISIG_ADDRESS:?set MULTISIG_ADDRESS=0x... (your Arbitrum One multisig)}"
MAX_USDC="${MAX_USDC:-100}"                       # per-signature cap, human USDC
EXPIRES_DAYS="${EXPIRES_DAYS:-30}"               # token/policy lifetime in days
POLICY_ID="arbitrum-usdc-deposit"
KEY_NAME="${KEY_NAME:-polypay-deposit-agent}"

command -v ows >/dev/null || { echo "✖ 'ows' CLI not found. Install: curl -fsSL https://docs.openwallet.sh/install.sh | bash"; exit 1; }

# ── Guard: wallet must exist (import it first — see README step 1) ──────────
if ! ows wallet list 2>/dev/null | grep -q "$WALLET"; then
  echo "✖ Wallet '$WALLET' not found in the vault."
  echo "  Import your funded EOA first (key read from stdin, never stored in shell history):"
  echo "      ows wallet import --name \"$WALLET\" --private-key"
  exit 1
fi

# ── Render the policy template ─────────────────────────────────────────────
CHECK_PATH="$(cd policy && pwd)/check-deposit.mjs"
chmod +x "$CHECK_PATH"
CREATED_AT="$(node -e "process.stdout.write(new Date().toISOString())")"
EXPIRES_AT="$(node -e "process.stdout.write(new Date(Date.now()+${EXPIRES_DAYS}*864e5).toISOString())")"
# Convert human USDC -> 6-decimal base units without float error.
MAX_VALUE="$(node -e 'const a=process.argv[1];const[i,f=""]=a.split(".");process.stdout.write((BigInt(i||"0")*1000000n+BigInt((f+"000000").slice(0,6))).toString())' "$MAX_USDC")"

RENDERED="policy/${POLICY_ID}.policy.json"
sed -e "s|__CREATED_AT__|$CREATED_AT|g" \
    -e "s|__EXPIRES_AT__|$EXPIRES_AT|g" \
    -e "s|__CHECK_PATH__|$CHECK_PATH|g" \
    -e "s|__MULTISIG__|$MULTISIG|g" \
    -e "s|__MAX_VALUE__|$MAX_VALUE|g" \
    policy/arbitrum-usdc-deposit.policy.template.json > "$RENDERED"

echo "→ Rendered policy: $RENDERED"
echo "    chain   : eip155:42161 (Arbitrum One)"
echo "    to      : $MULTISIG (only)"
echo "    token   : USDC 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (only)"
echo "    cap     : $MAX_USDC USDC ($MAX_VALUE base units) per signature"
echo "    expires : $EXPIRES_AT"

# ── Register policy (re-create cleanly) ────────────────────────────────────
ows policy delete --id "$POLICY_ID" --confirm >/dev/null 2>&1 || true
ows policy create --file "$RENDERED"

# ── Mint the scoped agent token ────────────────────────────────────────────
echo
echo "→ Creating scoped token (you'll be prompted for the vault passphrase)…"
ows key create --name "$KEY_NAME" --wallet "$WALLET" --policy "$POLICY_ID" --expires-at "$EXPIRES_AT"
echo
echo "✓ Copy the ows_key_... token above into .env as OWS_API_KEY (it is shown ONCE)."
echo "  Then: yarn deposit   (or: npm run deposit)"
