-- CreateTable
CREATE TABLE "public"."SlackIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "botUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SlackIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackIntegration_teamId_key" ON "public"."SlackIntegration"("teamId");

-- CreateIndex
CREATE INDEX "SlackIntegration_userId_idx" ON "public"."SlackIntegration"("userId");

-- CreateIndex
CREATE INDEX "SlackIntegration_teamId_idx" ON "public"."SlackIntegration"("teamId");

-- AddForeignKey
ALTER TABLE "public"."SlackIntegration" ADD CONSTRAINT "SlackIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
