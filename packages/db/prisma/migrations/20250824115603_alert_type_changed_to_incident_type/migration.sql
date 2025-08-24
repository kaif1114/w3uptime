/*
  Warnings:

  - The `type` column on the `Alert` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `description` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `escalated` on the `Incident` table. All the data in the column will be lost.
  - Added the required column `cause` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."IncidentType" AS ENUM ('TEST', 'URL_UNAVAILABLE');

-- AlterTable
ALTER TABLE "public"."Alert" DROP COLUMN "type",
ADD COLUMN     "type" "public"."IncidentType" NOT NULL DEFAULT 'TEST';

-- AlterTable
ALTER TABLE "public"."Incident" DROP COLUMN "description",
DROP COLUMN "escalated",
ADD COLUMN     "acknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cause" "public"."IncidentType" NOT NULL;

-- DropEnum
DROP TYPE "public"."AlertType";
