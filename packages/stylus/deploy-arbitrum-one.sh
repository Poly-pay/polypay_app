#!/usr/bin/env bash
#
# Deploy the full PolyPay Stylus stack to Arbitrum ONE MAINNET (42161):
#   0. PoseidonT3 hashing library (hardhat, deterministic CREATE2 -> 0x3333...)
#   1. Stylus impl            (cargo stylus, packages/stylus)
#   2. Rust EIP-1167 factory  (cargo stylus, packages/stylus-factory, bound to impl)
#   3. patch stylusImplAddress / stylusFactoryAddress for chain 42161 in
#      packages/shared/src/contracts/contracts-config.ts
#
# This spends REAL ETH on Arbitrum One. Requires:
#   - cargo-stylus installed
#   - PK exported with a deployer key funded with Arbitrum One ETH
#
# Usage:
#   export PK=0x<deployer-key>
#   bash packages/stylus/deploy-arbitrum-one.sh
#
# PoseidonT3 deploy is idempotent: if the deterministic library already exists
# on Arbitrum One it is skipped.

set -euo pipefail

# --- config (Arbitrum One, chain 42161) -------------------------------------
RPC="${RPC:-https://arb1.arbitrum.io/rpc}"   # cargo-stylus endpoint
ZKV="0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69"
VKHASH="0xb3c5381523a496996868370791ec7ae490be7e2c996296fb67708daed8a6ea38"
POSEIDON="0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93"
CHAIN_ID="42161"
COMMITMENTS="[1]"   # impl storage is unused; any valid non-zero set works
SIGS="1"
GAS_FLAGS="${GAS_FLAGS:---no-verify --max-fee-per-gas-gwei 0.1}"

# --- resolve paths ----------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STYLUS_DIR="$SCRIPT_DIR"
FACTORY_DIR="$SCRIPT_DIR/../stylus-factory"
HARDHAT_DIR="$SCRIPT_DIR/../hardhat"
CONFIG="$SCRIPT_DIR/../shared/src/contracts/contracts-config.ts"

# --- preflight --------------------------------------------------------------
if [[ -z "${PK:-}" ]]; then
  echo "ERROR: export PK=0x<deployer-key> first (key is never printed)." >&2
  exit 1
fi
command -v cargo >/dev/null || { echo "ERROR: cargo not found." >&2; exit 1; }
cargo stylus --version >/dev/null || { echo "ERROR: cargo-stylus not installed." >&2; exit 1; }
[[ -f "$CONFIG" ]] || { echo "ERROR: config not found at $CONFIG" >&2; exit 1; }

# --- mainnet guard ----------------------------------------------------------
echo "About to deploy to ARBITRUM ONE MAINNET (42161) using RPC $RPC."
echo "This spends real ETH. Type 'yes' to continue:"
read -r CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 1; }

strip_ansi() { sed $'s/\x1b\\[[0-9;]*m//g'; }
parse_addr() {
  strip_ansi | grep -iE 'deployed code at address' | grep -oiE '0x[0-9a-f]{40}' | head -n1
}

# --- 0. PoseidonT3 (hardhat, deterministic) ---------------------------------
echo "==> [0/3] Deploying PoseidonT3 on Arbitrum One (idempotent) ..."
( cd "$HARDHAT_DIR" && __RUNTIME_DEPLOYER_PRIVATE_KEY="$PK" ARBITRUM_RPC="$RPC" \
    npx hardhat deploy --tags PoseidonT3 --network arbitrum )

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

# --- 3. patch shared contracts-config.ts (42161 zero sentinels only) --------
# The 42161 entry is the only one with zero-address stylus addresses, so
# replacing the 0x000..0 sentinels is unambiguous and never touches 421614.
echo "==> [3/3] Patching $CONFIG (42161 stylusImpl / stylusFactory) ..."
perl -0pi -e "s/(stylusImplAddress:\\s*\")0x0{40}(\")/\${1}${IMPL_ADDR}\${2}/" "$CONFIG"
perl -0pi -e "s/(stylusFactoryAddress:\\s*\")0x0{40}(\")/\${1}${FACTORY_ADDR}\${2}/" "$CONFIG"

echo ""
echo "================ DONE (Arbitrum One) ================"
echo "  PoseidonT3           = $POSEIDON (deterministic)"
echo "  stylusImplAddress    = $IMPL_ADDR"
echo "  stylusFactoryAddress = $FACTORY_ADDR"
echo "  patched: $CONFIG"
echo "logs: impl=$IMPL_LOG  factory=$FACTORY_LOG"
echo ""
echo "Next:"
echo "  1. git diff packages/shared/src/contracts/contracts-config.ts"
echo "  2. Add the 42161 MetaMultiSigWalletStylusFactory entry (address=$FACTORY_ADDR)"
echo "     to packages/nextjs/contracts/deployedContracts.ts (reuse 421614 ABI)."
echo "  3. yarn workspace @polypay/shared build"
echo "  4. Verify zkVerify domain id 10 for 42161 in backend proof.ts before live."
echo "  5. Fund the relayer (RELAYER_WALLET_KEY) with Arbitrum One ETH."
