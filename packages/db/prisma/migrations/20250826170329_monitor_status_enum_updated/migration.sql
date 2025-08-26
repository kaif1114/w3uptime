/*
  Warnings:

  - The values [DISABLED] on the enum `MonitorStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MonitorStatus_new" AS ENUM ('ACTIVE', 'PAUSED', 'DOWN', 'RECOVERING');
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" TYPE "public"."MonitorStatus_new" USING ("status"::text::"public"."MonitorStatus_new");
ALTER TYPE "public"."MonitorStatus" RENAME TO "MonitorStatus_old";
ALTER TYPE "public"."MonitorStatus_new" RENAME TO "MonitorStatus";
DROP TYPE "public"."MonitorStatus_old";
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
