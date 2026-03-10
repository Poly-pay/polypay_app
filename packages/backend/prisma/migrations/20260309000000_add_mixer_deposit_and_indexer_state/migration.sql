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

-- CreateIndex
CREATE UNIQUE INDEX "mixer_deposits_chain_id_pool_id_leaf_index_key" ON "mixer_deposits"("chain_id", "pool_id", "leaf_index");

-- CreateIndex
CREATE INDEX "mixer_deposits_chain_id_pool_id_idx" ON "mixer_deposits"("chain_id", "pool_id");

-- CreateIndex
CREATE INDEX "mixer_deposits_chain_id_pool_id_leaf_index_idx" ON "mixer_deposits"("chain_id", "pool_id", "leaf_index");

-- CreateIndex
CREATE UNIQUE INDEX "mixer_indexer_state_chain_id_key" ON "mixer_indexer_state"("chain_id");
