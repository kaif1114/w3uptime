import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createProposalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["FEATURE_REQUEST", "CHANGE_REQUEST"]),
  tags: z.array(z.string()).optional().default([]),
});

// POST /api/proposals - Create a new proposal
export const POST = withAuth(async (req: NextRequest, user) => {
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
});

// GET /api/proposals - List proposals with filters and pagination
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Math.min(Number(searchParams.get("pageSize") || "10"), 50);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: any = {};
    if (type && ["FEATURE_REQUEST", "CHANGE_REQUEST"].includes(type))
      where.type = type as any;
    if (
      status &&
      [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "IMPLEMENTED",
      ].includes(status)
    )
      where.status = status as any;
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
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
