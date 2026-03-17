-- CreateEnum
CREATE TYPE "MixerWithdrawStatus" AS ENUM ('PENDING', 'AGGREGATED', 'EXECUTED', 'FAILED');

-- CreateTable
CREATE TABLE "mixer_deposits" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "pool_id" TEXT NOT NULL,
    "leaf_index" INTEGER NOT NULL,
    "commitment" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mixer_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mixer_indexer_state" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "last_indexed_block" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mixer_indexer_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mixer_withdraw_requests" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "nullifier_hash" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "status" "MixerWithdrawStatus" NOT NULL DEFAULT 'PENDING',
    "zkverify_tx_hash" TEXT,
    "aggregation_id" TEXT,
    "domain_id" INTEGER,
    "merkle_proof" TEXT[],
    "leaf_index" INTEGER,
    "leaf_count" INTEGER,
    "tx_hash" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mixer_withdraw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mixer_deposits_chain_id_pool_id_idx" ON "mixer_deposits"("chain_id", "pool_id");

-- CreateIndex
CREATE INDEX "mixer_deposits_chain_id_pool_id_leaf_index_idx" ON "mixer_deposits"("chain_id", "pool_id", "leaf_index");

-- CreateIndex
CREATE UNIQUE INDEX "mixer_deposits_chain_id_pool_id_leaf_index_key" ON "mixer_deposits"("chain_id", "pool_id", "leaf_index");

-- CreateIndex
CREATE UNIQUE INDEX "mixer_indexer_state_chain_id_key" ON "mixer_indexer_state"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "mixer_withdraw_requests_job_id_key" ON "mixer_withdraw_requests"("job_id");

-- CreateIndex
CREATE INDEX "mixer_withdraw_requests_status_idx" ON "mixer_withdraw_requests"("status");
