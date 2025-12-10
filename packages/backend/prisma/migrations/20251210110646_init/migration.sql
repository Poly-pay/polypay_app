-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('TRANSFER', 'ADD_SIGNER', 'REMOVE_SIGNER', 'SET_THRESHOLD');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'EXECUTING', 'EXECUTED', 'OUTDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('APPROVE', 'DENY');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'AGGREGATED', 'FAILED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountWallet" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txId" SERIAL NOT NULL,
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "nonce" INTEGER NOT NULL,
    "to" TEXT,
    "value" TEXT,
    "walletAddress" TEXT NOT NULL,
    "signerCommitment" TEXT,
    "newThreshold" INTEGER,
    "createdBy" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "txHash" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "txId" INTEGER NOT NULL,
    "voterCommitment" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "nullifier" TEXT,
    "jobId" TEXT,
    "proofStatus" "ProofStatus",
    "aggregationId" TEXT,
    "domainId" INTEGER DEFAULT 0,
    "merkleProof" TEXT[],
    "leafCount" INTEGER,
    "leafIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_commitment_key" ON "Account"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "AccountWallet_accountId_walletId_key" ON "AccountWallet"("accountId", "walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txId_key" ON "Transaction"("txId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_walletAddress_idx" ON "Transaction"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_nullifier_key" ON "Vote"("nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_jobId_key" ON "Vote"("jobId");

-- CreateIndex
CREATE INDEX "Vote_txId_idx" ON "Vote"("txId");

-- CreateIndex
CREATE INDEX "Vote_proofStatus_idx" ON "Vote"("proofStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_txId_voterCommitment_key" ON "Vote"("txId", "voterCommitment");

-- AddForeignKey
ALTER TABLE "AccountWallet" ADD CONSTRAINT "AccountWallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWallet" ADD CONSTRAINT "AccountWallet_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_txId_fkey" FOREIGN KEY ("txId") REFERENCES "Transaction"("txId") ON DELETE RESTRICT ON UPDATE CASCADE;
