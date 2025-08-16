/*
  Warnings:

  - The values [PAUSED,DISABLED] on the enum `MonitorStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [GOOD,BAD] on the enum `MonitorTickStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."StatusPageSectionType" AS ENUM ('STATUS', 'HISTORY', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."AffectedStatus" AS ENUM ('NONE', 'DOWNTIME', 'DEGRADED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('STATUS_CODE_ERROR', 'URL_UNAVAILABLE', 'PING_FAILURE', 'TIMEOUT', 'RESOLVED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."MonitorStatus_new" AS ENUM ('ACTIVE', 'PAUSE', 'DEAD_DISABLED');
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" TYPE "public"."MonitorStatus_new" USING ("status"::text::"public"."MonitorStatus_new");
ALTER TYPE "public"."MonitorStatus" RENAME TO "MonitorStatus_old";
ALTER TYPE "public"."MonitorStatus_new" RENAME TO "MonitorStatus";
DROP TYPE "public"."MonitorStatus_old";
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."MonitorTickStatus_new" AS ENUM ('Good', 'Bad');
ALTER TABLE "public"."monitorTick" ALTER COLUMN "status" TYPE "public"."MonitorTickStatus_new" USING ("status"::text::"public"."MonitorTickStatus_new");
ALTER TYPE "public"."MonitorTickStatus" RENAME TO "MonitorTickStatus_old";
ALTER TYPE "public"."MonitorTickStatus_new" RENAME TO "MonitorTickStatus";
DROP TYPE "public"."MonitorTickStatus_old";
COMMIT;

-- CreateTable
CREATE TABLE "public"."StatusPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "logo" TEXT,
    "supportUrl" TEXT,
    "announcement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatusPageSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "type" "public"."StatusPageSectionType" NOT NULL,
    "monitorId" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "maintenanceId" TEXT,

    CONSTRAINT "StatusPageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Update" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusPageId" TEXT NOT NULL,

    CONSTRAINT "Update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AffectedSections" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" "public"."AffectedStatus" NOT NULL,

    CONSTRAINT "AffectedSections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Maintenance" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "statusPageId" TEXT NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."StatusPageSection" ADD CONSTRAINT "StatusPageSection_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "public"."StatusPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusPageSection" ADD CONSTRAINT "StatusPageSection_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusPageSection" ADD CONSTRAINT "StatusPageSection_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "public"."Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Update" ADD CONSTRAINT "Update_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "public"."StatusPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffectedSections" ADD CONSTRAINT "AffectedSections_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "public"."Update"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffectedSections" ADD CONSTRAINT "AffectedSections_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."StatusPageSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Maintenance" ADD CONSTRAINT "Maintenance_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "public"."StatusPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
