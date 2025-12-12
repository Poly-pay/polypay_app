-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "AddressGroup" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddressGroup_walletId_idx" ON "AddressGroup"("walletId");

-- CreateIndex
CREATE INDEX "Contact_groupId_idx" ON "Contact"("groupId");

-- AddForeignKey
ALTER TABLE "AddressGroup" ADD CONSTRAINT "AddressGroup_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AddressGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
