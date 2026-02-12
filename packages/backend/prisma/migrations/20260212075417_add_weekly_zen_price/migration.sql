-- CreateTable
CREATE TABLE "weekly_zen_prices" (
    "id" SERIAL NOT NULL,
    "week" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_zen_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_zen_prices_week_key" ON "weekly_zen_prices"("week");
