-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "chain_id" INTEGER NOT NULL DEFAULT 26514;

-- AlterTable
ALTER TABLE "votes" ALTER COLUMN "domain_id" DROP DEFAULT;
