/*
  Warnings:

  - You are about to drop the column `isUp` on the `Monitor` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MonitorTickStatus" AS ENUM ('GOOD', 'BAD');

-- AlterTable
ALTER TABLE "Monitor" DROP COLUMN "isUp";

-- CreateTable
CREATE TABLE "monitorTick" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "status" "MonitorTickStatus" NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitorTick_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "monitorTick" ADD CONSTRAINT "monitorTick_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitorTick" ADD CONSTRAINT "monitorTick_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
