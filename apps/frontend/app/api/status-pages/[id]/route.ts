import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";

const updateSchema = z.object({
  name: z.string().optional(),
  isPublished: z.boolean().optional(),
  // Relax URL validation while prototyping uploads / non-http values
  logoUrl: z.string().nullable().optional(),
  logoHrefUrl: z.string().nullable().optional(),
  contactUrl: z.string().nullable().optional(),
  historyRange: z.enum(["7d", "30d", "90d"]).optional(),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        resources: z.array(
          z.object({ type: z.literal("monitor"), monitorId: z.string() })
        ),
      })
    )
    .optional(),
  maintenances: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        status: z.enum(["scheduled", "in_progress", "completed"]),
      })
    )
    .optional(),
  updates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional(),
});

export const GET = withAuth(
  async (_req: NextRequest, user, _session, context) => {
    try {
      const { id } = (await context.params) as { id: string };
      
      const statusPage = await prisma.statusPage.findFirst({
        where: {
          id,
          userId: user.id,
        },
        include: {
          statusPageSections: {
            orderBy: { order: "asc" },
          },
          maintenances: true,
          updates: true,
        },
      });

      if (!statusPage) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const response = {
        id: statusPage.id,
        userId: statusPage.userId,
        name: statusPage.name,
        isPublished: statusPage.isPublished,
        logoUrl: statusPage.logoUrl,
        logoHrefUrl: null, // Not in DB schema yet
        contactUrl: statusPage.supportUrl, // Map supportUrl to contactUrl
        historyRange: "7d", // Default value
        sections: statusPage.statusPageSections.map((section: any) => ({
          id: section.id,
          name: section.name,
          resources: [{ type: "monitor", monitorId: section.monitorId }],
        })),
        maintenances: statusPage.maintenances.map((maintenance: any) => ({
          id: maintenance.id,
          title: maintenance.title,
          description: maintenance.description,
          start: maintenance.from.toISOString(),
          end: maintenance.to.toISOString(),
          status: "scheduled", // Default status
        })),
        updates: statusPage.updates.map((update: any) => ({
          id: update.id,
          title: update.title,
          body: update.description,
          createdAt: update.publishedAt.toISOString(),
        })),
        createdAt: statusPage.createdAt.toISOString(),
        updatedAt: statusPage.updatedAt.toISOString(),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, user, _session, context) => {
    try {
      const { id } = (await context.params) as { id: string };
      
      // Check if status page exists and belongs to user
      const existingPage = await prisma.statusPage.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingPage) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const body = await req.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.message },
          { status: 400 }
        );
      }

      // Update the status page
      const updatedStatusPage = await prisma.statusPage.update({
        where: { id },
        data: {
          name: parsed.data.name || existingPage.name,
          isPublished: parsed.data.isPublished ?? existingPage.isPublished,
          logoUrl: parsed.data.logoUrl || existingPage.logoUrl,
          supportUrl: parsed.data.contactUrl || existingPage.supportUrl,
        },
        include: {
          statusPageSections: {
            orderBy: { order: "asc" },
          },
          maintenances: true,
          updates: true,
        },
      });

      // Update sections if provided
      if (parsed.data.sections) {
        // Delete existing sections
        await prisma.statusPageSection.deleteMany({
          where: { statusPageId: id },
        });

        // Create new sections
        if (parsed.data.sections.length > 0) {
          await prisma.statusPageSection.createMany({
            data: parsed.data.sections.map((section, index) => ({
              name: section.name,
              description: null,
              order: index + 1,
              type: "BOTH",
              monitorId: section.resources[0]?.monitorId || "",
              statusPageId: id,
            })),
          });
        }
      }

      // Fetch updated data
      const finalStatusPage = await prisma.statusPage.findUnique({
        where: { id },
        include: {
          statusPageSections: {
            orderBy: { order: "asc" },
          },
          maintenances: true,
          updates: true,
        },
      });

      if (!finalStatusPage) {
        return NextResponse.json({ error: "Status page not found" }, { status: 404 });
      }

      const response = {
        id: finalStatusPage.id,
        userId: finalStatusPage.userId,
        name: finalStatusPage.name,
        isPublished: finalStatusPage.isPublished,
        logoUrl: finalStatusPage.logoUrl,
        logoHrefUrl: null,
        contactUrl: finalStatusPage.supportUrl,
        historyRange: "7d",
        sections: finalStatusPage.statusPageSections.map((section: any) => ({
          id: section.id,
          name: section.name,
          resources: [{ type: "monitor", monitorId: section.monitorId }],
        })),
        maintenances: finalStatusPage.maintenances.map((maintenance: any) => ({
          id: maintenance.id,
          title: maintenance.title,
          description: maintenance.description,
          start: maintenance.from.toISOString(),
          end: maintenance.to.toISOString(),
          status: "scheduled",
        })),
        updates: finalStatusPage.updates.map((update: any) => ({
          id: update.id,
          title: update.title,
          body: update.description,
          createdAt: update.publishedAt.toISOString(),
        })),
        createdAt: finalStatusPage.createdAt.toISOString(),
        updatedAt: finalStatusPage.updatedAt.toISOString(),
      };

      return NextResponse.json({
        message: "Status page updated",
        statusPage: response,
      });
    } catch (error) {
      console.error("Error updating status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
  async (_req: NextRequest, user, _session, context) => {
    try {
      const { id } = (await context.params) as { id: string };
      
      // Check if status page exists and belongs to user
      const statusPage = await prisma.statusPage.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!statusPage) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Delete the status page (this will cascade delete related sections, etc.)
      await prisma.statusPage.delete({
        where: { id },
      });

      return NextResponse.json({ message: "Status page deleted" });
    } catch (error) {
      console.error("Error deleting status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
