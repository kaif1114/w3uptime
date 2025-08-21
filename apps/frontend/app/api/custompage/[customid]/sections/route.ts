import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { z } from "zod";

const createSectionSchema = z.object({
  name: z.string().optional(), // Optional - can be blank to hide section heading
  description: z.string().optional(),
  order: z.number().int().positive(),
  type: z.enum(["STATUS", "HISTORY", "BOTH"]).default("BOTH"),
  monitorId: z.string().min(1, "Monitor ID is required"),
});

const updateSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().optional(), // Optional for new sections
      name: z.string().optional(),
      description: z.string().optional(),
      order: z.number().int().positive(),
      type: z.enum(["STATUS", "HISTORY", "BOTH"]).default("BOTH"),
      monitorId: z.string().min(1, "Monitor ID is required"),
    })
  ),
});

// GET /api/custompage/[customid]/sections - Get all sections for a status page
export const GET = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const { customid } = await params;

      // Ensure the status page exists and belongs to the authenticated user
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

      const sections = await prisma.statusPageSection.findMany({
        where: { statusPageId: statusPage.id },
        select: {
          id: true,
          name: true,
          description: true,
          order: true,
          type: true,

          monitor: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({ sections });
    } catch (error) {
      console.error("Failed to fetch status page sections:", error);
      return NextResponse.json(
        { error: "Failed to fetch status page sections" },
        { status: 500 }
      );
    }
  }
);

// POST /api/custompage/[customid]/sections - Create or update sections
export const POST = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const { customid } = await params;
      const body = await req.json();
      const validation = updateSectionsSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      // Ensure the status page exists and belongs to the authenticated user
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

      const { sections } = validation.data;

      // Validate that all monitorIds belong to the user
      const monitorIds = sections.map((s) => s.monitorId);
      const userMonitors = await prisma.monitor.findMany({
        where: {
          id: { in: monitorIds },
          userId: user.id,
        },
        select: { id: true },
      });

      const userMonitorIds = new Set(userMonitors.map((m) => m.id));
      const invalidMonitorIds = monitorIds.filter((id) => !userMonitorIds.has(id));

      if (invalidMonitorIds.length > 0) {
        return NextResponse.json(
          {
            error: "One or more monitor IDs are invalid or don't belong to you",
            invalidMonitorIds,
          },
          { status: 400 }
        );
      }

      // Use a transaction to handle multiple section operations
      const result = await prisma.$transaction(async (tx) => {
        // Delete existing sections for this status page
        await tx.statusPageSection.deleteMany({
          where: { statusPageId: statusPage.id },
        });

        // Create new sections
        const createdSections = await Promise.all(
          sections.map((section) =>
            tx.statusPageSection.create({
              data: {
                name: section.name || "",
                description: section.description || "",
                order: section.order,
                type: section.type,
                monitorId: section.monitorId,
                statusPageId: statusPage.id,
              },
              select: {
                id: true,
                name: true,
                description: true,
                order: true,
                type: true,
                monitorId: true,
                monitor: {
                  select: {
                    id: true,
                    name: true,
                    url: true,
                  },
                },
              },
            })
          )
        );

        return createdSections;
      });

      return NextResponse.json(
        {
          message: "Sections updated successfully",
          sections: result,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Failed to update sections:", error);
      return NextResponse.json(
        { error: "Failed to update sections" },
        { status: 500 }
      );
    }
  }
);


