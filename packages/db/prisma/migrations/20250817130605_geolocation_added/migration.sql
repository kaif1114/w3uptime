/*
  Warnings:

  - A unique constraint covering the columns `[geoLocationId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "geoLocationId" TEXT;

-- CreateTable
CREATE TABLE "public"."GeoLocation" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "continent" TEXT,
    "continentCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezoneAbbreviation" TEXT,
    "flag" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "GeoLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoLocation_userId_key" ON "public"."GeoLocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_geoLocationId_key" ON "public"."User"("geoLocationId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_geoLocationId_fkey" FOREIGN KEY ("geoLocationId") REFERENCES "public"."GeoLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
