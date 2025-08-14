/*
  Warnings:

  - Added the required column `userId` to the `EscalationPolicy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."EscalationPolicy" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."EscalationPolicy" ADD CONSTRAINT "EscalationPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
