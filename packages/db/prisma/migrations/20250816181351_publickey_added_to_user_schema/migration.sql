/*
  Warnings:

  - A unique constraint covering the columns `[publicKey]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `walletAddress` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "publicKey" TEXT,
ALTER COLUMN "walletAddress" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicKey_key" ON "public"."User"("publicKey");
