-- AlterTable
-- Remove deprecated totalReputation field that is no longer used
-- Reputation is now calculated dynamically using getReputation()
ALTER TABLE "User" DROP COLUMN "totalReputation";

