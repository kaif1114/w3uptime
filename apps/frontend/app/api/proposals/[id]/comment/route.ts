import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createCommentSchema = z.object({
  content: z.string().min(1),
});

// GET /api/proposals/[id]/comment - List comments for a proposal
export const GET = withAuth(
  async (_req: NextRequest, _user, _session, { params }: any) => {
    try {
      const { id: proposalId } = params;
      const comments = await prisma.proposalComment.findMany({
        where: { proposalId },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, walletAddress: true } } },
      });
      return NextResponse.json({ comments });
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }
  }
);

// POST /api/proposals/[id]/comment - Add a new comment
export const POST = withAuth(
  async (req: NextRequest, user, _session, { params }: any) => {
    try {
      const { id: proposalId } = params;
      const body = await req.json();
      const validation = createCommentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      // ensure proposal exists
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
      });
      if (!proposal)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );

      const comment = await prisma.proposalComment.create({
        data: {
          proposalId,
          userId: user.id,
          content: validation.data.content,
        },
        include: { user: { select: { id: true, walletAddress: true } } },
      });
      return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
      console.error("Failed to add comment:", error);
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }
  }
);
