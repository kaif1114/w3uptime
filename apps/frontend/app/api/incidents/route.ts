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
    // Use hardcoded monitor ID instead of from request body
    const monitorId = validation.data.monitorId;

    // Check if monitor exists and belongs to user
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

// GET /api/incidents - Get all incidents (with optional monitor filter)
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const monitorId = searchParams.get("monitorId");

    const whereClause: Prisma.IncidentWhereInput = {
      Monitor: {
        userId: user.id,
      },
    };

    // Add monitor filter if provided
    if (monitorId) {
      whereClause.monitorId = monitorId;
    }

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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
});
