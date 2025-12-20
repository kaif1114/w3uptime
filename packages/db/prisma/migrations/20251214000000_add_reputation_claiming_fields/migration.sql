-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalReputation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claimedReputation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastClaimAt" TIMESTAMP(3);
