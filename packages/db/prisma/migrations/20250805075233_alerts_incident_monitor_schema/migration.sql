-- CreateEnum
CREATE TYPE "public"."MonitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'POSTMORTEM');

-- CreateEnum
CREATE TYPE "public"."IncidentSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."EscalationChannel" AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "public"."MonitorTickStatus" AS ENUM ('GOOD', 'BAD');

-- CreateTable
CREATE TABLE "public"."Validator" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Validator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Monitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "checkInterval" INTEGER NOT NULL DEFAULT 300,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "expectedStatusCodes" INTEGER[] DEFAULT ARRAY[200, 201, 202, 204]::INTEGER[],
    "status" "public"."MonitorStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monitorTick" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "status" "public"."MonitorTickStatus" NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitorTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Escalation" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EscalationLevel" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "levelOrder" INTEGER NOT NULL,
    "waitMinutes" INTEGER NOT NULL,
    "channel" "public"."EscalationChannel" NOT NULL DEFAULT 'EMAIL',
    "contacts" TEXT[],
    "message" TEXT,
    "webhookMethod" TEXT DEFAULT 'POST',
    "webhookHeaders" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggerStatusCode" INTEGER,
    "expectedStatusCode" INTEGER,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "currentEscalationLevel" INTEGER NOT NULL DEFAULT 1,
    "escalationCompleted" BOOLEAN NOT NULL DEFAULT false,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "public"."IncidentSeverity" NOT NULL DEFAULT 'MINOR',
    "status" "public"."IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "monitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "downtime" INTEGER,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "postmortemId" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Postmortem" (
    "id" TEXT NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "rootCause" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postmortem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Validator_publicKey_key" ON "public"."Validator"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_monitorId_key" ON "public"."Escalation"("monitorId");

-- CreateIndex
CREATE INDEX "EscalationLevel_escalationId_levelOrder_idx" ON "public"."EscalationLevel"("escalationId", "levelOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationLevel_escalationId_levelOrder_key" ON "public"."EscalationLevel"("escalationId", "levelOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_monitorId_key" ON "public"."Incident"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_postmortemId_key" ON "public"."Incident"("postmortemId");

-- CreateIndex
CREATE UNIQUE INDEX "Postmortem_incidentId_key" ON "public"."Postmortem"("incidentId");

-- AddForeignKey
ALTER TABLE "public"."Monitor" ADD CONSTRAINT "Monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monitorTick" ADD CONSTRAINT "monitorTick_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monitorTick" ADD CONSTRAINT "monitorTick_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "public"."Validator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Escalation" ADD CONSTRAINT "Escalation_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscalationLevel" ADD CONSTRAINT "EscalationLevel_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "public"."Escalation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Postmortem" ADD CONSTRAINT "Postmortem_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
