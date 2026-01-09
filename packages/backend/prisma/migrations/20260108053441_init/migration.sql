-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('TRANSFER', 'ADD_SIGNER', 'REMOVE_SIGNER', 'SET_THRESHOLD', 'BATCH');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'EXECUTING', 'EXECUTED', 'OUTDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('APPROVE', 'DENY');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'AGGREGATED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMMITMENT_RECEIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_signers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "is_creator" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "tx_id" SERIAL NOT NULL,
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "nonce" INTEGER NOT NULL,
    "to" TEXT,
    "value" TEXT,
    "token_address" TEXT,
    "account_address" TEXT NOT NULL,
    "contact_id" TEXT,
    "signer_commitment" TEXT,
    "new_threshold" INTEGER,
    "batch_data" TEXT,
    "created_by" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "tx_hash" TEXT,
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserved_nonces" (
    "id" TEXT NOT NULL,
    "account_address" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserved_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "tx_id" INTEGER NOT NULL,
    "voter_commitment" TEXT NOT NULL,
    "vote_type" "VoteType" NOT NULL,
    "nullifier" TEXT,
    "job_id" TEXT,
    "proof_status" "ProofStatus",
    "aggregation_id" TEXT,
    "domain_id" INTEGER DEFAULT 175,
    "merkle_proof" TEXT[],
    "leaf_count" INTEGER,
    "leaf_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "recipient" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "token_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_groups" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_group_entries" (
    "contact_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "contact_group_entries_pkey" PRIMARY KEY ("contact_id","group_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_commitment_key" ON "users"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_address_key" ON "accounts"("address");

-- CreateIndex
CREATE UNIQUE INDEX "account_signers_user_id_account_id_key" ON "account_signers"("user_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_id_key" ON "transactions"("tx_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_account_address_idx" ON "transactions"("account_address");

-- CreateIndex
CREATE INDEX "transactions_contact_id_idx" ON "transactions"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_account_address_nonce_key" ON "transactions"("account_address", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "reserved_nonces_account_address_nonce_key" ON "reserved_nonces"("account_address", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "votes_job_id_key" ON "votes"("job_id");

-- CreateIndex
CREATE INDEX "votes_tx_id_idx" ON "votes"("tx_id");

-- CreateIndex
CREATE INDEX "votes_proof_status_idx" ON "votes"("proof_status");

-- CreateIndex
CREATE UNIQUE INDEX "votes_tx_id_voter_commitment_key" ON "votes"("tx_id", "voter_commitment");

-- CreateIndex
CREATE INDEX "batch_items_user_id_idx" ON "batch_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_groups_account_id_name_key" ON "contact_groups"("account_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_account_id_name_key" ON "contacts"("account_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_account_id_address_key" ON "contacts"("account_id", "address");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_idx" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "notifications_sender_id_idx" ON "notifications"("sender_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- AddForeignKey
ALTER TABLE "account_signers" ADD CONSTRAINT "account_signers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_signers" ADD CONSTRAINT "account_signers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_address_fkey" FOREIGN KEY ("account_address") REFERENCES "accounts"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "transactions"("tx_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_group_entries" ADD CONSTRAINT "contact_group_entries_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_group_entries" ADD CONSTRAINT "contact_group_entries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "contact_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
