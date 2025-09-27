/*
  Warnings:

  - You are about to drop the column `message` on the `EscalationLevel` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `EscalationLevel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."EscalationLevel" DROP COLUMN "message",
DROP COLUMN "name";
