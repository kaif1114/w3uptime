/*
  Warnings:

  - You are about to drop the column `userId` on the `monitorTick` table. All the data in the column will be lost.
  - Added the required column `ValidatorId` to the `monitorTick` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."monitorTick" DROP CONSTRAINT "monitorTick_userId_fkey";

-- AlterTable
ALTER TABLE "public"."monitorTick" DROP COLUMN "userId",
ADD COLUMN     "ValidatorId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."monitorTick" ADD CONSTRAINT "monitorTick_ValidatorId_fkey" FOREIGN KEY ("ValidatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
