/*
  Warnings:

  - You are about to drop the column `validatorId` on the `monitorTick` table. All the data in the column will be lost.
  - You are about to drop the `Validator` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `monitorTick` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('USER', 'VALIDATOR');

-- DropForeignKey
ALTER TABLE "public"."monitorTick" DROP CONSTRAINT "monitorTick_validatorId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "public"."UserType" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "public"."monitorTick" DROP COLUMN "validatorId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Validator";

-- AddForeignKey
ALTER TABLE "public"."monitorTick" ADD CONSTRAINT "monitorTick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
