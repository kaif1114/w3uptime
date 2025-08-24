/*
  Warnings:

  - You are about to drop the column `acknowledged` on the `Incident` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Incident" DROP COLUMN "acknowledged";
