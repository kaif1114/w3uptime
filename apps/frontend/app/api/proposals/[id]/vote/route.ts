import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const voteSchema = z.object({
  vote: z.enum(["UPVOTE", "DOWNVOTE"]),
});

// POST /api/proposals/[id]/vote - Cast or toggle a vote
export const POST = withAuth(
  async (req: NextRequest, user, _session, { params }: any) => {
    try {
      const { id: proposalId } = params;
      const body = await req.json();
      const validation = voteSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }
      const { vote } = validation.data;

      // Ensure proposal exists
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
      });
      if (!proposal)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );

      const existing = await prisma.proposalVote
        .findUnique({
          where: { proposalId_userId: { proposalId, userId: user.id } },
        })
        .catch(async () => {
          // Fallback for older Prisma versions without named compound unique
          const found = await prisma.proposalVote.findFirst({
            where: { proposalId, userId: user.id },
          });
          return found as any;
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
