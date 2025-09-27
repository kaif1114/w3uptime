import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { stopEscalation } from "@/lib/escalation";

const updateIncidentSchema = z.object({
  status: z.enum(["ONGOING", "ACKNOWLEDGED", "RESOLVED"]),
});

// GET /api/incidents/[incidentid] - Get specific incident
export const GET = withAuth(
  async (
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
);

export const PATCH = withAuth(
  async (
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
      const { status } = validation.data;
      if (status === "RESOLVED" && existingIncident.status === "RESOLVED") {
        return NextResponse.json(
          { error: "Incident is already resolved" },
          { status: 400 }
        );
      }

      if (
        status === "ACKNOWLEDGED" &&
        existingIncident.status === "ACKNOWLEDGED"
      ) {
        return NextResponse.json(
          { error: "Incident is already acknowledged" },
          { status: 400 }
        );
      }

      if (status === "ONGOING" && existingIncident.status === "ONGOING") {
        return NextResponse.json(
          { error: "Incident is already ongoing" },
          { status: 400 }
        );
      }

      // Update incident and create timeline events in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const updatedIncident = await tx.incident.update({
          where: {
            id: incidentid,
          },
          data: {
            status,

            resolvedAt: status === "RESOLVED" ? new Date() : null,
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

        // Create timeline events for status changes
        if (status === "RESOLVED") {
          await tx.timelineEvent.create({
            data: {
              description: `Incident was marked as resolved by ${user.id}`,
              incidentId: incidentid,
              type: "INCIDENT",
              userId: user.id,
            },
          });
        }

        if (status === "ACKNOWLEDGED") {
          await tx.timelineEvent.create({
            data: {
              description: `User ${user.id} acknowledged the incident`,
              incidentId: incidentid,
              type: "INCIDENT",
              userId: user.id,
            },
          });
        }

        return updatedIncident;
      });

      // Stop escalation if incident is acknowledged or resolved
      if (status === "ACKNOWLEDGED" || status === "RESOLVED") {
        try {
          await stopEscalation(result.Monitor.id, incidentid);
          console.log(`Escalation stopped for incident ${incidentid} (status: ${status})`);
        } catch (escalationError) {
          console.error(`❌ Failed to stop escalation for incident ${incidentid}:`, escalationError);
          // Don't fail the entire request if escalation stopping fails
        }
      }

      return NextResponse.json({
        message: "Incident updated successfully",
        incident: result,
      });
    } catch (error) {
      console.error("Failed to update incident:", error);
      return NextResponse.json(
        { error: "Failed to update incident" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/incidents/[incidentid] - Delete incident
export const DELETE = withAuth(
  async (
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

      // Delete incident in a transaction to ensure timeline events are deleted first
      await prisma.$transaction(async (tx) => {
        // Delete all timeline events first
        await tx.timelineEvent.deleteMany({
          where: {
            incidentId: incidentid,
          },
        });

        // Then delete the incident
        await tx.incident.delete({
          where: {
            id: incidentid,
          },
        });
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
);
