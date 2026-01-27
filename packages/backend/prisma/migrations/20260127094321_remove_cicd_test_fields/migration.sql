/*
  Warnings:

  - You are about to drop the column `cicd_test_field` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `cicd_test_field2` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `cicd_test_field3` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `cicd_test_field4` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "cicd_test_field",
DROP COLUMN "cicd_test_field2",
DROP COLUMN "cicd_test_field3",
DROP COLUMN "cicd_test_field4";
