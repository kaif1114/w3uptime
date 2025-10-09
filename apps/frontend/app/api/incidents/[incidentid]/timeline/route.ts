import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";


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

    const timelineEvents = await prisma.timelineEvent.findMany({
      where: {
        incidentId: incidentid,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
        escalationLog: {
          include: {
            Alert: {
              select: {
                id: true,
                title: true,
                message: true,
                type: true,
                triggerStatusCode: true,
                expectedStatusCode: true,
                triggeredAt: true,
              },
            },
            escalationLevel: {
              select: {
                id: true,
                levelOrder: true,
                waitMinutes: true,
                channel: true,
                contacts: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ timelineEvents });
  } catch (error) {
    console.error("Failed to fetch timeline events:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline events" },
      { status: 500 }
    );
  }
});