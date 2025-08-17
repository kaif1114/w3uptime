/*
  Warnings:

  - You are about to drop the `monitorTick` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."monitorTick" DROP CONSTRAINT "monitorTick_monitorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."monitorTick" DROP CONSTRAINT "monitorTick_validatorId_fkey";

-- DropTable
DROP TABLE "public"."monitorTick";

-- CreateTable
CREATE TABLE "public"."MonitorTick" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "status" "public"."MonitorTickStatus" NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "countryCode" TEXT NOT NULL,
    "continentCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorTick_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."MonitorTick" ADD CONSTRAINT "MonitorTick_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "public"."Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonitorTick" ADD CONSTRAINT "MonitorTick_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
