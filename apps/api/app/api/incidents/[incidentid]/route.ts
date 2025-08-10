import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

const updateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "MAINTENANCE"]).optional(),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED", "POSTMORTEM"]).optional(),
  escalated: z.boolean().optional(),
  downtime: z.number().int().positive().optional(),
});

// Hardcoded user ID (matching monitors API)
const HARDCODED_USER_ID = "user-123";


// GET /api/incidents/[incidentid] - Get specific incident
export async function GET(
  req: NextRequest,
  { params }: { params: { incidentid: string } }
) {
  try {
    const { incidentid } = params;

    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
      include: {
        monitor: {
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
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Failed to fetch incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

// PUT /api/incidents/[incidentid] - Update incident
export async function PUT(
  req: NextRequest,
  { params }: { params: { incidentid: string } }
) {
  try {
    const { incidentid } = params;
    const body = await req.json();

    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const existingIncident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // Auto-set resolvedAt when status changes to RESOLVED
    if (validation.data.status === "RESOLVED" && existingIncident.status !== "RESOLVED") {
      updateData.resolvedAt = new Date();
      
      if (!validation.data.downtime) {
        const downtimeSeconds = Math.floor(
          (new Date().getTime() - existingIncident.createdAt.getTime()) / 1000
        );
        updateData.downtime = downtimeSeconds;
      }
    }

    const updatedIncident = await prisma.incident.update({
      where: {
        id: incidentid,
      },
      data: updateData,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        postmortem: true,
      },
    });

    return NextResponse.json({
      message: "Incident updated successfully",
      incident: updatedIncident,
    });
  } catch (error) {
    console.error("Failed to update incident:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[incidentid] - Delete incident
export async function DELETE(
  req: NextRequest,
  { params }: { params: { incidentid: string } }
) {
  try {
    const { incidentid } = params;

    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    await prisma.incident.delete({
      where: {
        id: incidentid,
      },
    });

    return NextResponse.json({ message: "Incident deleted successfully" });
  } catch (error) {
    console.error("Failed to delete incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}
