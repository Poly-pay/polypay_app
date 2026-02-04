-- CreateTable
CREATE TABLE "claim_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "reward_usd" DOUBLE PRECISION NOT NULL,
    "reward_zen" DOUBLE PRECISION NOT NULL,
    "to_address" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_histories_user_id_idx" ON "claim_histories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "claim_histories_user_id_week_key" ON "claim_histories"("user_id", "week");

-- AddForeignKey
ALTER TABLE "claim_histories" ADD CONSTRAINT "claim_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
