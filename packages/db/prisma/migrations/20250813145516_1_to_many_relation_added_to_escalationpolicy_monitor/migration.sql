/*
  Warnings:

  - You are about to drop the `Escalation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Escalation" DROP CONSTRAINT "Escalation_monitorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EscalationLevel" DROP CONSTRAINT "EscalationLevel_escalationId_fkey";

-- AlterTable
ALTER TABLE "public"."Monitor" ADD COLUMN     "escalationPolicyId" TEXT;

-- DropTable
DROP TABLE "public"."Escalation";

-- CreateTable
CREATE TABLE "public"."EscalationPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationPolicy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Monitor" ADD CONSTRAINT "Monitor_escalationPolicyId_fkey" FOREIGN KEY ("escalationPolicyId") REFERENCES "public"."EscalationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscalationLevel" ADD CONSTRAINT "EscalationLevel_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "public"."EscalationPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
