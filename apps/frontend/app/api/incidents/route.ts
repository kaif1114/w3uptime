import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "MAINTENANCE"]).default("MINOR"),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED", "POSTMORTEM"]).default("INVESTIGATING"),
  monitorId: z.string().min(1).optional(), // Make optional since we'll use hardcoded value
  escalated: z.boolean().default(false),
});

// Hardcoded user ID (matching monitors API)
const HARDCODED_USER_ID = "user-123";
// Hardcoded monitor ID for testing
const HARDCODED_MONITOR_ID = "a9be5b60-ae13-4bb1-af74-f49660086e49";



// POST /api/incidents - Create new incident
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { title, description, severity, status, escalated } = validation.data;
    // Use hardcoded monitor ID instead of from request body
    const monitorId = HARDCODED_MONITOR_ID;

    // Check if monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: HARDCODED_USER_ID,
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
        severity,
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
}

// GET /api/incidents - Get all incidents (with optional monitor filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryMonitorId = searchParams.get("monitorId");

    const whereClause: any = {
      monitor: {
        userId: HARDCODED_USER_ID,
      },
    };

    // Use query parameter if provided, otherwise use hardcoded monitor ID
    const targetMonitorId = queryMonitorId || HARDCODED_MONITOR_ID;
    whereClause.monitorId = targetMonitorId;

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
            createdAt: 'desc',
          },
        },
        postmortem: true,
      },
      orderBy: {
        createdAt: 'desc',
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
}
