/*
  Warnings:

  - You are about to drop the column `signer_commitments` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "signer_commitments",
ADD COLUMN     "signer_data" TEXT;
