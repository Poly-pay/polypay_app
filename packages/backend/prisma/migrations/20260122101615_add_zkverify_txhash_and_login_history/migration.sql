-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "zkverify_tx_hash" TEXT;

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "zkverify_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_history_commitment_idx" ON "login_history"("commitment");

-- CreateIndex
CREATE INDEX "login_history_wallet_address_idx" ON "login_history"("wallet_address");
