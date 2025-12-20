import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ProposalType, ProposalStatus } from "@prisma/client";

const updateProposalSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  type: z.nativeEnum(ProposalType).optional(),
  status: z.nativeEnum(ProposalStatus).optional(),
  tags: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}


export const GET = async (
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const proposal = await prisma.proposal.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, walletAddress: true } },
          votes: true,
          voteCaches: true,
          comments: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, walletAddress: true } } },
          },
        },
      });

      if (!proposal)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );
      return NextResponse.json({ proposal });
    } catch (error) {
      console.error("Failed to fetch proposal:", error);
      return NextResponse.json(
        { error: "Failed to fetch proposal" },
        { status: 500 }
      );
    }
  }



export const PATCH = withAuth(
  async (
    req: NextRequest,
    user,
    _session,
    { params }: RouteParams
  ): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validation = updateProposalSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const proposal = await prisma.proposal.update({
        where: { id },
        data: validation.data,
      });
      return NextResponse.json({ proposal });
    } catch (error) {
      console.error("Failed to update proposal:", error);
      return NextResponse.json(
        { error: "Failed to update proposal" },
        { status: 500 }
      );
    }
  }
);


export const DELETE = withAuth(
  async (
    _req: NextRequest,
    user,
    _session,
    { params }: RouteParams
  ): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing)
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 }
        );
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.proposal.delete({ where: { id } });
      return NextResponse.json({ message: "Deleted" });
    } catch (error) {
      console.error("Failed to delete proposal:", error);
      return NextResponse.json(
        { error: "Failed to delete proposal" },
        { status: 500 }
      );
    }
  }
);
