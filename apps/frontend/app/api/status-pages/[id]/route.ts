import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { DbStatusPageSection, DbMaintenance, DbUpdate } from "@/types/database";
import { prisma } from "db/client";

const updateSchema = z.object({
  name: z.string().optional(),
  isPublished: z.boolean().optional(),
  
  logoUrl: z.string().nullable().optional(),
  logoLinkUrl: z.string().nullable().optional(),
  supportUrl: z.string().nullable().optional(),
  historyRange: z.enum(["7d", "30d", "90d"]).optional(),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        widgetType: z.enum(["current", "with_history", "with_history_chart"]).optional(),
        resources: z.array(
          z.object({
            id: z.string().optional(),
            type: z.literal("monitor"),
            monitorId: z.string(),
          })
        ),
      })
    )
    .optional(),
  removedSectionIds: z.array(z.string()).optional(),
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
      const { id } = (await (context as { params: Promise<{ id: string }> }).params);
      
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
        logoLinkUrl: statusPage.logo,
        supportUrl: statusPage.supportUrl,
        historyRange: "7d", 
        sections: statusPage.statusPageSections.map((section) => {
          
          let widgetType: "current" | "with_history" | "with_history_chart" = "with_history";
          
          switch (section.type) {
            case "STATUS":
              widgetType = "current";
              break;
            case "HISTORY":
              widgetType = "with_history";
              break;
            case "BOTH":
              widgetType = "with_history_chart";
              break;
            default:
              widgetType = "with_history";
          }

          return {
            id: section.id,
            name: section.name,
            widgetType,
            resources: [{
              id: crypto.randomUUID(),
              type: "monitor" as const,
              monitorId: section.monitorId,
            }],
          };
        }),
        maintenances: statusPage.maintenances.map((maintenance: DbMaintenance) => ({
          id: maintenance.id,
          title: maintenance.title,
          description: maintenance.description,
          start: maintenance.from.toISOString(),
          end: maintenance.to.toISOString(),
          status: "scheduled", 
        })),
        updates: statusPage.updates.map((update: DbUpdate) => ({
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
      const { id } = (await (context as { params: Promise<{ id: string }> }).params);
      
      
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

      
      const updatedStatusPage = await prisma.statusPage.update({
        where: { id },
        data: {
          name: parsed.data.name ?? existingPage.name,
          isPublished: parsed.data.isPublished ?? existingPage.isPublished,
          logoUrl: parsed.data.logoUrl ?? existingPage.logoUrl,
          logo: parsed.data.logoLinkUrl ?? existingPage.logo,
          
          supportUrl: parsed.data.supportUrl ?? existingPage.supportUrl,
        },
        include: {
          statusPageSections: {
            orderBy: { order: "asc" },
          },
          maintenances: true,
          updates: true,
        },
      });

      
      if (parsed.data.sections) {
        
        for (let index = 0; index < parsed.data.sections.length; index++) {
          const section = parsed.data.sections[index];
          const resource = section.resources?.[0];
          const monitorId = resource?.monitorId;

          
          let dbType: "STATUS" | "HISTORY" | "BOTH" = "BOTH";
          
          switch (section.widgetType) {
            case "current":
              dbType = "STATUS";
              break;
            case "with_history":
              dbType = "HISTORY";
              break;
            case "with_history_chart":
              dbType = "BOTH";
              break;
            default:
              dbType = "BOTH";
          }

          try {
            await prisma.statusPageSection.update({
              where: { id: section.id },
              data: {
                name: section.name,
                type: dbType,
                order: index + 1,
                ...(typeof monitorId === "string" && monitorId.trim().length > 0
                  ? { monitorId }
                  : {}),
              },
            });
          } catch (_err) {
            
            if (typeof monitorId === "string" && monitorId.trim().length > 0) {
              await prisma.statusPageSection.create({
                data: {
                  id: section.id,
                  name: section.name,
                  type: dbType,
                  order: index + 1,
                  monitorId,
                  statusPageId: id,
                },
              });
            }
          }
        }
      }

      
      if (parsed.data.removedSectionIds && parsed.data.removedSectionIds.length > 0) {
        await prisma.statusPageSection.deleteMany({
          where: {
            id: { in: parsed.data.removedSectionIds },
            statusPageId: id,
          },
        });
      }

      
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
        logoLinkUrl: finalStatusPage.logo,
        supportUrl: finalStatusPage.supportUrl,
        historyRange: "7d",
        sections: finalStatusPage.statusPageSections.map((section) => {
          
          let widgetType: "current" | "with_history" | "with_history_chart" = "with_history";
          
          switch (section.type) {
            case "STATUS":
              widgetType = "current";
              break;
            case "HISTORY":
              widgetType = "with_history";
              break;
            case "BOTH":
              widgetType = "with_history_chart";
              break;
            default:
              widgetType = "with_history";
          }

          return {
            id: section.id,
            name: section.name,
            widgetType,
            resources: [{
              id: crypto.randomUUID(),
              type: "monitor" as const,
              monitorId: section.monitorId,
            }],
          };
        }),
        maintenances: finalStatusPage.maintenances.map((maintenance: DbMaintenance) => ({
          id: maintenance.id,
          title: maintenance.title,
          description: maintenance.description,
          start: maintenance.from.toISOString(),
          end: maintenance.to.toISOString(),
          status: "scheduled",
        })),
        updates: finalStatusPage.updates.map((update: DbUpdate) => ({
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
      const { id } = (await (context as { params: Promise<{ id: string }> }).params);
      
      
      const statusPage = await prisma.statusPage.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!statusPage) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      
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
