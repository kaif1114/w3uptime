import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { VoteType } from "@prisma/client";
import {
  requireReputation,
  MIN_REP_FOR_VOTE,
} from "../../ReputationGuard";

const voteSchema = z.object({
  vote: z.nativeEnum(VoteType),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}


export const POST = withAuth(
  async (
    req: NextRequest,
    user,
    _session,
    { params }: RouteParams
  ): Promise<NextResponse> => {
    try {
      const repCheck = await requireReputation(user.id, MIN_REP_FOR_VOTE);
      if (!repCheck.ok) {
        return NextResponse.json(
          { error: "Insufficient reputation to vote on proposals" },
          { status: 403 }
        );
      }
      const { id: proposalId } = await params;
      const body = await req.json();
      const validation = voteSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }
      const { vote } = validation.data;


      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
      });
      if (!proposal)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );

      // CRITICAL: Reject database votes for on-chain proposals
      // Only DRAFT proposals can use database voting
      if (proposal.onChainStatus !== "DRAFT") {
        console.log(
          `❌ Rejected database vote for proposal ${proposalId} with onChainStatus: ${proposal.onChainStatus}`
        );
        return NextResponse.json(
          {
            error:
              proposal.onChainStatus === "ACTIVE"
                ? "This proposal requires on-chain voting via MetaMask. Please vote through the blockchain."
                : `Voting is not available for proposals with status: ${proposal.onChainStatus}`,
          },
          { status: 400 }
        );
      }

      console.log(
        `✅ Accepting database vote for DRAFT proposal ${proposalId}`
      );

      const existing = await prisma.proposalVote
        .findUnique({
          where: { proposalId_userId: { proposalId, userId: user.id } },
        })
        .catch(async () => {
          
          const found = await prisma.proposalVote.findFirst({
            where: { proposalId, userId: user.id },
          });
          return found;
        });

      if (!existing) {
        const created = await prisma.proposalVote.create({
          data: { proposalId, userId: user.id, vote },
        });
        return NextResponse.json({ vote: created }, { status: 201 });
      }

      if (existing.vote === vote) {
        await prisma.proposalVote.delete({ where: { id: existing.id } });
        return NextResponse.json({ message: "Vote removed" });
      } else {
        const updated = await prisma.proposalVote.update({
          where: { id: existing.id },
          data: { vote },
        });
        return NextResponse.json({ vote: updated });
      }
    } catch (error) {
      console.error("Failed to cast vote:", error);
      return NextResponse.json(
        { error: "Failed to cast vote" },
        { status: 500 }
      );
    }
  }
);
