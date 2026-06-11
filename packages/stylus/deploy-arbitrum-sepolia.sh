#!/usr/bin/env bash
#
# Deploy the PolyPay Stylus stack to Arbitrum Sepolia (421614) for testing:
#   1. Stylus impl            (cargo stylus, packages/stylus)
#   2. Rust EIP-1167 factory  (cargo stylus, packages/stylus-factory, bound to impl)
#   3. patch stylusImplAddress / stylusFactoryAddress for chain 421614 in
#      packages/shared/src/contracts/contracts-config.ts
#
# PoseidonT3 + zkVerify are already deployed on Arbitrum Sepolia.
#
# Usage:
#   export PK=0x<deployer-key-with-arb-sepolia-eth>
#   bash packages/stylus/deploy-arbitrum-sepolia.sh
#
# After deploy: create a NEW account on Arbitrum Sepolia (it will use the new
# factory -> new impl) and run a transfer / batch to exercise execute().

set -euo pipefail

# --- config (Arbitrum Sepolia, chain 421614) --------------------------------
RPC="${RPC:-https://sepolia-rollup.arbitrum.io/rpc}"
ZKV="0xd007494945580eEb25522c8e0b2fa798B3F0FDE2"
VKHASH="0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38"
POSEIDON="0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93"
CHAIN_ID="421614"
COMMITMENTS="[1]"   # impl storage is unused; any valid non-zero set works
SIGS="1"
GAS_FLAGS="${GAS_FLAGS:---no-verify --max-fee-per-gas-gwei 0.1}"

# --- resolve paths ----------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STYLUS_DIR="$SCRIPT_DIR"
FACTORY_DIR="$SCRIPT_DIR/../stylus-factory"
CONFIG="$SCRIPT_DIR/../shared/src/contracts/contracts-config.ts"

# --- preflight --------------------------------------------------------------
if [[ -z "${PK:-}" ]]; then
  echo "ERROR: export PK=0x<deployer-key> first (key is never printed)." >&2
  exit 1
fi
command -v cargo >/dev/null || { echo "ERROR: cargo not found." >&2; exit 1; }
cargo stylus --version >/dev/null || { echo "ERROR: cargo-stylus not installed." >&2; exit 1; }
[[ -f "$CONFIG" ]] || { echo "ERROR: config not found at $CONFIG" >&2; exit 1; }

strip_ansi() { sed $'s/\x1b\\[[0-9;]*m//g'; }
parse_addr() {
  strip_ansi | grep -iE 'deployed code at address' | grep -oiE '0x[0-9a-f]{40}' | head -n1
}

# --- 1. Stylus impl ---------------------------------------------------------
echo "==> [1/3] Deploying Stylus impl from $STYLUS_DIR ..."
IMPL_LOG="$(mktemp)"
( cd "$STYLUS_DIR" && cargo stylus deploy \
    --endpoint "$RPC" \
    --private-key "$PK" \
    $GAS_FLAGS \
    --constructor-args "$ZKV" "$VKHASH" "$POSEIDON" "$CHAIN_ID" "$COMMITMENTS" "$SIGS" \
) 2>&1 | tee "$IMPL_LOG"

IMPL_ADDR="$(parse_addr < "$IMPL_LOG")"
[[ -n "$IMPL_ADDR" ]] || { echo "ERROR: could not parse impl address." >&2; exit 1; }
echo "==> impl deployed at: $IMPL_ADDR"

# --- 2. Rust EIP-1167 factory bound to the impl -----------------------------
echo "==> [2/3] Deploying Rust factory from $FACTORY_DIR (impl=$IMPL_ADDR) ..."
FACTORY_LOG="$(mktemp)"
( cd "$FACTORY_DIR" && cargo stylus deploy \
    --endpoint "$RPC" \
    --private-key "$PK" \
    $GAS_FLAGS \
    --constructor-args "$IMPL_ADDR" \
) 2>&1 | tee "$FACTORY_LOG"

FACTORY_ADDR="$(parse_addr < "$FACTORY_LOG")"
[[ -n "$FACTORY_ADDR" ]] || { echo "ERROR: could not parse factory address." >&2; exit 1; }
echo "==> factory deployed at: $FACTORY_ADDR"

# --- 3. patch shared contracts-config.ts (chain 421614 entry) ---------------
# 421614 is the first entry in the file with these keys, so the non-global
# substitution targets it (the 42161 entry comes after).
echo "==> [3/3] Patching $CONFIG (421614 stylusImpl / stylusFactory) ..."
perl -0pi -e "s/(stylusImplAddress:\\s*\")0x[0-9a-fA-F]+(\")/\${1}${IMPL_ADDR}\${2}/" "$CONFIG"
perl -0pi -e "s/(stylusFactoryAddress:\\s*\")0x[0-9a-fA-F]+(\")/\${1}${FACTORY_ADDR}\${2}/" "$CONFIG"

echo ""
echo "================ DONE (Arbitrum Sepolia) ================"
echo "  stylusImplAddress    = $IMPL_ADDR"
echo "  stylusFactoryAddress = $FACTORY_ADDR"
echo "  patched: $CONFIG"
echo ""
echo "Next:"
echo "  1. git diff packages/shared/src/contracts/contracts-config.ts"
echo "  2. yarn workspace @polypay/shared build"
echo "  3. Create a NEW account on Arbitrum Sepolia (uses the new factory->impl),"
echo "     then send a transfer and a batch to exercise execute() end-to-end."
