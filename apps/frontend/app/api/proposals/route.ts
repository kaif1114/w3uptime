import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ProposalType, ProposalStatus } from "@prisma/client";

const createProposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.nativeEnum(ProposalType),
  tags: z.array(z.string()).optional().default([]),
});

const queryParamsSchema = z.object({
  page: z.string().optional().default("1"),
  pageSize: z.string().optional().default("10"),
  type: z.nativeEnum(ProposalType).optional(),
  status: z.nativeEnum(ProposalStatus).optional(),
  q: z.string().optional(),
});

// POST /api/proposals - Create a new proposal
export const POST = withAuth(
  async (req: NextRequest, user): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const validation = createProposalSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      const { title, description, type, tags } = validation.data;

      const proposal = await prisma.proposal.create({
        data: {
          title,
          description,
          type,
          tags,
          userId: user.id,
        },
      });

      return NextResponse.json({ proposal }, { status: 201 });
    } catch (error) {
      console.error("Failed to create proposal:", error);
      return NextResponse.json(
        { error: "Failed to create proposal" },
        { status: 500 }
      );
    }
  }
);

// GET /api/proposals - List proposals with filters and pagination
export const GET = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const queryValidation = queryParamsSchema.safeParse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      q: searchParams.get("q"),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const {
      page: pageStr,
      pageSize: pageSizeStr,
      type,
      status,
      q,
    } = queryValidation.data;
    const page = Number(pageStr);
    const pageSize = Math.min(Number(pageSizeStr), 50);

    const where: {
      type?: ProposalType;
      status?: ProposalStatus;
      OR?: Array<
        | { title: { contains: string; mode: "insensitive" } }
        | { description: { contains: string; mode: "insensitive" } }
      >;
    } = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, walletAddress: true } },
          votes: true,
          comments: true,
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({ data: proposals, page, pageSize, total });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
});
