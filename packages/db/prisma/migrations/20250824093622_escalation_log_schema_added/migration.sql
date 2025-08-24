/*
  Warnings:

  - The values [STATUS_CODE_ERROR,PING_FAILURE,TIMEOUT,RESOLVED] on the enum `AlertType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `acknowledgedAt` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `acknowledgedBy` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `currentEscalationLevel` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `escalationCompleted` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `acknowledgedBy` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `channel` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `levelName` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `levelOrder` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedIssue` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `sentTo` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `triggeredAt` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Postmortem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `escalationLevelId` to the `EscalationLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TimelineEventType" AS ENUM ('INCIDENT', 'USER_COMMENT', 'POSTMORTEM', 'ESCALATION');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AlertType_new" AS ENUM ('TEST', 'URL_UNAVAILABLE');
ALTER TYPE "public"."AlertType" RENAME TO "AlertType_old";
ALTER TYPE "public"."AlertType_new" RENAME TO "AlertType";
DROP TYPE "public"."AlertType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Postmortem" DROP CONSTRAINT "Postmortem_incidentId_fkey";

-- DropIndex
DROP INDEX "public"."EscalationLog_alertId_levelOrder_idx";

-- AlterTable
ALTER TABLE "public"."Alert" DROP COLUMN "acknowledgedAt",
DROP COLUMN "acknowledgedBy",
DROP COLUMN "currentEscalationLevel",
DROP COLUMN "escalationCompleted",
DROP COLUMN "severity",
DROP COLUMN "status",
ADD COLUMN     "type" "public"."AlertType" NOT NULL DEFAULT 'TEST';

-- AlterTable
ALTER TABLE "public"."EscalationLog" DROP COLUMN "acknowledgedBy",
DROP COLUMN "channel",
DROP COLUMN "levelName",
DROP COLUMN "levelOrder",
DROP COLUMN "resolvedIssue",
DROP COLUMN "sentTo",
DROP COLUMN "triggeredAt",
ADD COLUMN     "escalationLevelId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Comment";

-- DropTable
DROP TABLE "public"."Postmortem";

-- DropEnum
DROP TYPE "public"."AlertSeverity";

-- DropEnum
DROP TYPE "public"."AlertStatus";

-- CreateTable
CREATE TABLE "public"."TimelineEvent" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "public"."TimelineEventType" NOT NULL DEFAULT 'USER_COMMENT',
    "userId" TEXT,
    "escalationLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEvent_escalationLogId_key" ON "public"."TimelineEvent"("escalationLogId");

-- CreateIndex
CREATE INDEX "EscalationLog_alertId_idx" ON "public"."EscalationLog"("alertId");

-- CreateIndex
CREATE INDEX "EscalationLog_escalationLevelId_idx" ON "public"."EscalationLog"("escalationLevelId");

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_escalationLogId_fkey" FOREIGN KEY ("escalationLogId") REFERENCES "public"."EscalationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscalationLog" ADD CONSTRAINT "EscalationLog_escalationLevelId_fkey" FOREIGN KEY ("escalationLevelId") REFERENCES "public"."EscalationLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
