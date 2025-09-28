-- AlterTable
ALTER TABLE "public"."Alert" ADD COLUMN     "incidentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
