/*
  Warnings:

  - Added the required column `city` to the `monitorTick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `continentCode` to the `monitorTick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countryCode` to the `monitorTick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `monitorTick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `monitorTick` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."monitorTick" ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "continentCode" TEXT NOT NULL,
ADD COLUMN     "countryCode" TEXT NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL;
