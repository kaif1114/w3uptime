import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["ONGOING", "ACKNOWLEDGED", "RESOLVED"]).default("ONGOING"),
  monitorId: z.string().min(1),
  escalated: z.boolean().default(false),
});

// POST /api/incidents - Create new incident
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = createIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { title, description, status, escalated } = validation.data;

    const monitorId = validation.data.monitorId;

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.id,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: `Monitor not found with ID: ${monitorId}` },
        { status: 404 }
      );
    }

    // No unique constraint check needed - multiple incidents allowed per monitor
    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        status,
        monitorId,
        escalated,
      },
      include: {
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Incident created successfully",
        incident,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
});

// GET /api/incidents - Get all incidents (with optional monitor filter, pagination, and sorting)
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const monitorId = searchParams.get("monitorId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status");

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters. Page must be >= 1, limit must be 1-100" },
        { status: 400 }
      );
    }

    // Validate monitorId if provided
    if (monitorId) {
      // Check if monitorId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(monitorId)) {
        return NextResponse.json(
          { error: "Invalid monitorId format" },
          { status: 400 }
        );
      }

      // Verify the monitor exists and belongs to the user
      const monitor = await prisma.monitor.findFirst({
        where: {
          id: monitorId,
          userId: user.id,
        },
      });

      if (!monitor) {
        return NextResponse.json(
          { error: "Monitor not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Build where clause
    const whereClause: Prisma.IncidentWhereInput = {
      Monitor: {
        userId: user.id,
      },
    };

    // Add monitor filter if provided
    if (monitorId) {
      whereClause.monitorId = monitorId;
    }

    // Add status filter if provided
    if (status && ["ONGOING", "ACKNOWLEDGED", "RESOLVED"].includes(status)) {
      whereClause.status = status as any;
    }

    // Validate and build sort options
    const validSortFields = ["createdAt", "updatedAt", "title", "status"];
    const validSortOrders = ["asc", "desc"];
    
    if (!validSortFields.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
      return NextResponse.json(
        { error: "Invalid sort parameters" },
        { status: 400 }
      );
    }

    const orderBy = { [sortBy]: sortOrder };

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await prisma.incident.count({
      where: whereClause,
    });

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        postmortem: true,
      },
      orderBy,
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      incidents,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        monitorId: monitorId || null,
        status: status || null,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
});
