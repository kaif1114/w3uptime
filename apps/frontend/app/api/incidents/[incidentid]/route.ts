import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const updateIncidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string(),
  status: z.enum(["ONGOING", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  escalated: z.boolean().optional(),
  downtime: z.number().int().positive().optional(),
});

// GET /api/incidents/[incidentid] - Get specific incident
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ incidentid: string }> }
) => {
  try {
    const { incidentid } = await params;

    if (!incidentid) {
      return NextResponse.json(
        { error: "Incident ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching incident with ID: ${incidentid} for user: ${user.id}`);

    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        Monitor: {
          userId: user.id,
        },
      },
      include: {
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            escalationPolicy: {
              select: {
                id: true,
                name: true,
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
          orderBy: {
            createdAt: "desc",
          },
        },
        postmortem: true,
      },
    });

    if (!incident) {
      console.log(`Incident not found for ID: ${incidentid}`);
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    console.log(`Incident found: ${incident.id}`);
    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Failed to fetch incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ incidentid: string }> }
) => {
  try {
    const { incidentid } = await params;
    const body = await req.json();
    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    // Ensure the incident ID from params matches the one in the body
    if (validation.data.id !== incidentid) {
      return NextResponse.json(
        { error: "Incident ID mismatch" },
        { status: 400 }
      );
    }

    const existingIncident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        Monitor: {
          userId: user.id,
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
    if (
      validation.data.status === "RESOLVED" &&
      existingIncident.status !== "RESOLVED"
    ) {
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
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            escalationPolicy: {
              select: {
                id: true,
                name: true,
              },
            },
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
});

// DELETE /api/incidents/[incidentid] - Delete incident
export const DELETE = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ incidentid: string }> }
) => {
  try {
    const { incidentid } = await params;

    if (!incidentid) {
      return NextResponse.json(
        { error: "Incident ID is required" },
        { status: 400 }
      );
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentid,
        Monitor: {
          userId: user.id,
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
});
