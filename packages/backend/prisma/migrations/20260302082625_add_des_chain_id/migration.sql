-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "bridge_fee" TEXT,
ADD COLUMN     "dest_chain_id" INTEGER;
