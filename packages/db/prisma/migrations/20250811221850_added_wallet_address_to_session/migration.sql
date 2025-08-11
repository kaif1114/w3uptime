/*
  Warnings:

  - Added the required column `walletAddress` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Session" ADD COLUMN     "walletAddress" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Session_walletAddress_idx" ON "public"."Session"("walletAddress");
