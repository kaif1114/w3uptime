import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import type { AffectedStatus } from "@prisma/client";

const createStatusUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  publishedAt: z.string().datetime("Invalid ISO datetime").optional(),
  affectedSections: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        status: z.enum(["NONE", "DOWNTIME", "DEGRADED", "RESOLVED"]),
      })
    )
    .default([]),
});

export const POST = withAuth(
  async (
    req: NextRequest,
    user,
    _session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const body = await req.json();
      const validation = createStatusUpdateSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      const { customid } = await params;

      
      const statusPage = await prisma.statusPage.findFirst({
        where: { id: customid, userId: user.id },
        select: { id: true },
      });

      if (!statusPage) {
        return NextResponse.json(
          { error: "Status page not found" },
          { status: 404 }
        );
      }

      const { title, description, publishedAt, affectedSections } =
        validation.data;

      const update = await prisma.update.create({
        data: {
          title,
          description,
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          statusPageId: statusPage.id,
          affectedSections:
            affectedSections.length > 0
              ? {
                  create: affectedSections.map((section) => ({
                    sectionId: section.sectionId,
                    status: section.status as AffectedStatus,
                  })),
                }
              : undefined,
        },
        include: {
          affectedSections: true,
        },
      });

      return NextResponse.json(
        {
          message: "Status update created successfully",
          update,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Failed to create status update:", error);
      return NextResponse.json(
        { error: "Failed to create status update" },
        { status: 500 }
      );
    }
  }
);
