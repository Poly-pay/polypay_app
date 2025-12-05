-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'READY', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'VERIFIED', 'AGGREGATED', 'FAILED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txId" INTEGER NOT NULL,
    "to" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "callData" TEXT,
    "signaturesRequired" INTEGER NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofJob" (
    "id" TEXT NOT NULL,
    "txId" INTEGER NOT NULL,
    "nullifier" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "aggregationId" TEXT,
    "domainId" INTEGER DEFAULT 0,
    "merkleProof" TEXT[],
    "leafCount" INTEGER,
    "leafIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txId_key" ON "Transaction"("txId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProofJob_nullifier_key" ON "ProofJob"("nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "ProofJob_jobId_key" ON "ProofJob"("jobId");

-- CreateIndex
CREATE INDEX "ProofJob_txId_idx" ON "ProofJob"("txId");

-- CreateIndex
CREATE INDEX "ProofJob_status_idx" ON "ProofJob"("status");

-- AddForeignKey
ALTER TABLE "ProofJob" ADD CONSTRAINT "ProofJob_txId_fkey" FOREIGN KEY ("txId") REFERENCES "Transaction"("txId") ON DELETE RESTRICT ON UPDATE CASCADE;
