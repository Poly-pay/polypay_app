-- CreateEnum
CREATE TYPE "QuestCategory" AS ENUM ('RECURRING', 'DAILY');

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "type" "QuestCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quest_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "account_id" TEXT,
    "tx_id" INTEGER,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quests_code_key" ON "quests"("code");

-- CreateIndex
CREATE INDEX "point_histories_user_id_idx" ON "point_histories"("user_id");

-- CreateIndex
CREATE INDEX "point_histories_quest_id_idx" ON "point_histories"("quest_id");

-- CreateIndex
CREATE INDEX "point_histories_earned_at_idx" ON "point_histories"("earned_at");

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
