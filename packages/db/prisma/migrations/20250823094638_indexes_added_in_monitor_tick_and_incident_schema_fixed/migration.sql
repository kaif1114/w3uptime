/*
  Warnings:

  - The values [INVESTIGATING,IDENTIFIED,MONITORING,POSTMORTEM] on the enum `IncidentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `severity` on the `Incident` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."IncidentStatus_new" AS ENUM ('ONGOING', 'ACKNOWLEDGED', 'RESOLVED');
ALTER TABLE "public"."Incident" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Incident" ALTER COLUMN "status" TYPE "public"."IncidentStatus_new" USING ("status"::text::"public"."IncidentStatus_new");
ALTER TYPE "public"."IncidentStatus" RENAME TO "IncidentStatus_old";
ALTER TYPE "public"."IncidentStatus_new" RENAME TO "IncidentStatus";
DROP TYPE "public"."IncidentStatus_old";
ALTER TABLE "public"."Incident" ALTER COLUMN "status" SET DEFAULT 'ONGOING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Incident" DROP COLUMN "severity",
ALTER COLUMN "status" SET DEFAULT 'ONGOING';

-- DropEnum
DROP TYPE "public"."IncidentSeverity";

-- CreateIndex
CREATE INDEX "MonitorTick_createdAt_idx" ON "public"."MonitorTick"("createdAt");

-- CreateIndex
CREATE INDEX "MonitorTick_city_createdAt_idx" ON "public"."MonitorTick"("city", "createdAt");

-- CreateIndex
CREATE INDEX "MonitorTick_continentCode_createdAt_idx" ON "public"."MonitorTick"("continentCode", "createdAt");

-- CreateIndex
CREATE INDEX "MonitorTick_countryCode_createdAt_idx" ON "public"."MonitorTick"("countryCode", "createdAt");

-- CreateIndex
CREATE INDEX "MonitorTick_monitorId_createdAt_idx" ON "public"."MonitorTick"("monitorId", "createdAt");

-- CreateIndex
CREATE INDEX "MonitorTick_status_createdAt_idx" ON "public"."MonitorTick"("status", "createdAt");
