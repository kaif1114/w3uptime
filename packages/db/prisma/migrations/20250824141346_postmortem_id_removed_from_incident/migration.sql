/*
  Warnings:

  - You are about to drop the column `postmortemId` on the `Incident` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Incident_postmortemId_key";

-- AlterTable
ALTER TABLE "public"."Incident" DROP COLUMN "postmortemId";
