/*
  Warnings:

  - The values [PAUSE,DEAD_DISABLED] on the enum `MonitorStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Good,Bad] on the enum `MonitorTickStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MonitorStatus_new" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" TYPE "public"."MonitorStatus_new" USING ("status"::text::"public"."MonitorStatus_new");
ALTER TYPE "public"."MonitorStatus" RENAME TO "MonitorStatus_old";
ALTER TYPE "public"."MonitorStatus_new" RENAME TO "MonitorStatus";
DROP TYPE "public"."MonitorStatus_old";
ALTER TABLE "public"."Monitor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."MonitorTickStatus_new" AS ENUM ('GOOD', 'BAD');
ALTER TABLE "public"."monitorTick" ALTER COLUMN "status" TYPE "public"."MonitorTickStatus_new" USING ("status"::text::"public"."MonitorTickStatus_new");
ALTER TYPE "public"."MonitorTickStatus" RENAME TO "MonitorTickStatus_old";
ALTER TYPE "public"."MonitorTickStatus_new" RENAME TO "MonitorTickStatus";
DROP TYPE "public"."MonitorTickStatus_old";
COMMIT;
