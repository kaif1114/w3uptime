import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const addCommentSchema = z.object({
  description: z.string().min(1, "Comment description is required"),
});


export const POST = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ incidentid: string }> }
) => {
  try {
    const { incidentid } = await params;
    const body = await req.json();
    
    if (!incidentid) {
      return NextResponse.json(
        { error: "Incident ID is required" },
        { status: 400 }
      );
    }

    const validation = addCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
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

    const { description } = validation.data;

    
    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        description,
        incidentId: incidentid,
        type: "USER_COMMENT",
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        message: "Comment added successfully",
        timelineEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
});