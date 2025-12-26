/*
  Warnings:

  - A unique constraint covering the columns `[walletAddress,nonce]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ReservedNonce" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservedNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservedNonce_walletAddress_nonce_key" ON "ReservedNonce"("walletAddress", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_walletAddress_nonce_key" ON "Transaction"("walletAddress", "nonce");
