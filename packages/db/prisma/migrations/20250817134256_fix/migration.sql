/*
  Warnings:

  - You are about to drop the column `userId` on the `GeoLocation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."GeoLocation_userId_key";

-- AlterTable
ALTER TABLE "public"."GeoLocation" DROP COLUMN "userId",
ADD COLUMN     "region" TEXT,
ADD COLUMN     "regionCode" TEXT;
