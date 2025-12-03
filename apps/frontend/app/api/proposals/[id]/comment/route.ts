import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import {
  requireReputation,
  MIN_REP_FOR_COMMENT,
} from "../../ReputationGuard";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}


export const GET = withAuth(
  async (
    _req: NextRequest,
    _user,
    _session,
    { params }: RouteParams
  ): Promise<NextResponse> => {
    try {
        // Reputation gate:
        const repCheck = await requireReputation(_user.id, MIN_REP_FOR_COMMENT);
        if (!repCheck.ok) {
          return NextResponse.json(
            { error: "Insufficient reputation to comment on proposals" },
            { status: 403 }
          );
        }
  
      const { id: proposalId } = await params;
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


export const POST = withAuth(
  async (
    req: NextRequest,
    user,
    _session,
    { params }: RouteParams
  ): Promise<NextResponse> => {
    try {
      const { id: proposalId } = await params;
      const body = await req.json();
      const validation = createCommentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      
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
