-- AlterTable
ALTER TABLE "public"."Validator" ADD COLUMN     "nonce" TEXT,
ADD COLUMN     "nonceExpiry" TIMESTAMP(3);
