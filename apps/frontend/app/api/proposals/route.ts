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

    // For now, return mock data to test the frontend integration
    // TODO: Replace with actual database queries once DB is properly configured
    const mockProposals = [
      {
        id: "1",
        title: "Add Dark Mode Support",
        description:
          "Implement a dark theme option for better user experience in low-light environments.",
        type: "FEATURE_REQUEST",
        status: "SUBMITTED",
        tags: ["UI/UX", "Accessibility", "Theme"],
        userId: "user1",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        user: {
          id: "user1",
          walletAddress: "0x1234...5678",
        },
        votes: [
          {
            id: "v1",
            proposalId: "1",
            userId: "user2",
            vote: "UPVOTE",
            createdAt: new Date("2024-01-16"),
          },
          {
            id: "v2",
            proposalId: "1",
            userId: "user3",
            vote: "UPVOTE",
            createdAt: new Date("2024-01-17"),
          },
        ],
        comments: [],
      },
      {
        id: "2",
        title: "Improve Notification System",
        description:
          "Enhance the current notification system with better filtering options and customizable alerts.",
        type: "CHANGE_REQUEST",
        status: "UNDER_REVIEW",
        tags: ["Notifications", "User Experience"],
        userId: "user2",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-12"),
        user: {
          id: "user2",
          walletAddress: "0x8765...4321",
        },
        votes: [
          {
            id: "v3",
            proposalId: "2",
            userId: "user1",
            vote: "UPVOTE",
            createdAt: new Date("2024-01-11"),
          },
        ],
        comments: [],
      },
    ];

    // Apply filters to mock data
    let filteredProposals = mockProposals;

    if (type && type !== "all") {
      filteredProposals = filteredProposals.filter((p) => p.type === type);
    }

    if (status && status !== "all") {
      filteredProposals = filteredProposals.filter((p) => p.status === status);
    }

    if (query) {
      filteredProposals = filteredProposals.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProposals = filteredProposals.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedProposals,
      page,
      pageSize,
      total: filteredProposals.length,
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
};
