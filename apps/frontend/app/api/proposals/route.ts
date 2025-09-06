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
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Math.min(Number(searchParams.get("pageSize") || "10"), 50);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    // Build where clause for filtering
    const where: any = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Fetch proposals from database with relations
    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      data: proposals,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
};
