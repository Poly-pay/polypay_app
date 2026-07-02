-- AlterTable
ALTER TABLE "account_signers" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "chain_type" TEXT NOT NULL DEFAULT 'zk';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ALTER COLUMN "commitment" DROP NOT NULL;

-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "signature" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

