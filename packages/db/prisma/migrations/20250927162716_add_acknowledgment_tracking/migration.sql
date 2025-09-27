-- AlterTable
ALTER TABLE "public"."EscalationLog" ADD COLUMN     "acknowledgedBy" TEXT,
ADD COLUMN     "acknowledgedVia" "public"."EscalationChannel";
