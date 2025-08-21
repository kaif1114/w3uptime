/*
  Warnings:

  - The primary key for the `MonitorTick` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."MonitorTick" DROP CONSTRAINT "MonitorTick_pkey",
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "MonitorTick_pkey" PRIMARY KEY ("id", "createdAt");
