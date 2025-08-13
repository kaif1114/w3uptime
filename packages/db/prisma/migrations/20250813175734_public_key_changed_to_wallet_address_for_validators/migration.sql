/*
  Warnings:

  - You are about to drop the column `publicKey` on the `Validator` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[walletAddress]` on the table `Validator` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `walletAddress` to the `Validator` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Validator_publicKey_key";

-- AlterTable
ALTER TABLE "public"."Validator" DROP COLUMN "publicKey",
ADD COLUMN     "walletAddress" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Validator_walletAddress_key" ON "public"."Validator"("walletAddress");
