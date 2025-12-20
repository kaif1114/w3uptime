/*
  Warnings:

  - A unique constraint covering the columns `[onChainId]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creationTxHash]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[finalizationTxHash]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."OnChainStatus" AS ENUM ('DRAFT', 'PENDING_ONCHAIN', 'ACTIVE', 'PASSED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."Proposal" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "creationTxHash" TEXT,
ADD COLUMN     "finalizationTxHash" TEXT,
ADD COLUMN     "onChainId" INTEGER,
ADD COLUMN     "onChainStatus" "public"."OnChainStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "votingEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."VoteCache" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "onChainProposalId" INTEGER NOT NULL,
    "voterAddress" TEXT NOT NULL,
    "voteType" "public"."VoteType" NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoteCache_txHash_key" ON "public"."VoteCache"("txHash");

-- CreateIndex
CREATE INDEX "VoteCache_proposalId_idx" ON "public"."VoteCache"("proposalId");

-- CreateIndex
CREATE INDEX "VoteCache_onChainProposalId_idx" ON "public"."VoteCache"("onChainProposalId");

-- CreateIndex
CREATE INDEX "VoteCache_voterAddress_idx" ON "public"."VoteCache"("voterAddress");

-- CreateIndex
CREATE INDEX "VoteCache_txHash_idx" ON "public"."VoteCache"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "VoteCache_proposalId_voterAddress_key" ON "public"."VoteCache"("proposalId", "voterAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_onChainId_key" ON "public"."Proposal"("onChainId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_creationTxHash_key" ON "public"."Proposal"("creationTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_finalizationTxHash_key" ON "public"."Proposal"("finalizationTxHash");

-- CreateIndex
CREATE INDEX "Proposal_onChainId_idx" ON "public"."Proposal"("onChainId");

-- CreateIndex
CREATE INDEX "Proposal_onChainStatus_idx" ON "public"."Proposal"("onChainStatus");

-- CreateIndex
CREATE INDEX "Proposal_votingEndsAt_idx" ON "public"."Proposal"("votingEndsAt");

-- AddForeignKey
ALTER TABLE "public"."VoteCache" ADD CONSTRAINT "VoteCache_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
