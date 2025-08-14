-- DropForeignKey
ALTER TABLE "public"."EscalationPolicy" DROP CONSTRAINT "EscalationPolicy_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."EscalationPolicy" ADD CONSTRAINT "EscalationPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
