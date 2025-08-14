/*
  Warnings:

  - You are about to drop the column `ValidatorId` on the `monitorTick` table. All the data in the column will be lost.
  - Added the required column `validatorId` to the `monitorTick` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."monitorTick" DROP CONSTRAINT "monitorTick_ValidatorId_fkey";

-- AlterTable
ALTER TABLE "public"."monitorTick" DROP COLUMN "ValidatorId",
ADD COLUMN     "validatorId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."monitorTick" ADD CONSTRAINT "monitorTick_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
