import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import bullMQEscalationService from "@/lib/escalationBullmq";

const createIncidentSchema = z.object({
  title: z.string().min(1),
  cause: z.enum(["TEST", "URL_UNAVAILABLE"]).default("URL_UNAVAILABLE"),
  status: z.enum(["ONGOING", "ACKNOWLEDGED", "RESOLVED"]).default("ONGOING"),
  monitorId: z.string().min(1),
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

    const { title, cause, status, monitorId } = validation.data;

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

    // Create incident with initial timeline event in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the incident
      const incident = await tx.incident.create({
        data: {
          title,
          cause,
          status,
          monitorId,
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
        },
      });

      // Create initial timeline event
      await tx.timelineEvent.create({
        data: {
          description: `Incident "${title}" was created`,
          incidentId: incident.id,
          type: "INCIDENT",
          userId: user.id,
        },
      });

      return incident;
    });

    // Trigger BullMQ escalation if monitor has escalation policy
    if (result.Monitor.escalationPolicy) {
      try {
        await bullMQEscalationService.startEscalation({
          monitorId: result.monitorId,
          incidentTitle: result.title,
          timestamp: result.createdAt,
        });
        console.log(`🚨 BullMQ escalation triggered for incident: ${result.title}`);
      } catch (escalationError) {
        console.error('Failed to trigger escalation:', escalationError);
        // Don't fail the incident creation if escalation fails
      }
    }

    return NextResponse.json(
      {
        message: "Incident created successfully",
        incident: result,
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

// GET /api/incidents - Get all incidents
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        Monitor: {
          userId: user.id,
        },
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
