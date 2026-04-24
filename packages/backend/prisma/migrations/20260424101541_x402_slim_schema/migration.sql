-- v2 schema for x402 deposits: single-signature, no fee, status PENDING|SETTLED|FAILED.
-- Idempotent: drops any v1 leftovers (table + enum + indexes) before recreating.
-- Safe because v1 schema was never deployed to production.

DROP INDEX IF EXISTS "x402_deposits_fee_auth_nonce_key";
DROP TABLE IF EXISTS "x402_deposits";
DROP TYPE IF EXISTS "X402DepositStatus";

CREATE TYPE "X402DepositStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED');

CREATE TABLE "x402_deposits" (
    "id" TEXT NOT NULL,
    "buyer_address" TEXT NOT NULL,
    "multisig_address" TEXT NOT NULL,
    "principal_amount" TEXT NOT NULL,
    "principal_auth_nonce" TEXT NOT NULL,
    "principal_tx_hash" TEXT,
    "chain_id" INTEGER NOT NULL,
    "status" "X402DepositStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "x402_deposits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "x402_deposits_principal_auth_nonce_key" ON "x402_deposits"("principal_auth_nonce");
CREATE INDEX "x402_deposits_multisig_address_idx" ON "x402_deposits"("multisig_address");
CREATE INDEX "x402_deposits_buyer_address_idx" ON "x402_deposits"("buyer_address");
CREATE INDEX "x402_deposits_created_at_idx" ON "x402_deposits"("created_at");
