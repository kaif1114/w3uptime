import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";

const createSchema = z.object({
  name: z.string().min(1),
  isPublished: z.boolean().optional().default(false),
  // Accept any string for logo so we can support uploads/data URLs during prototyping
  logoUrl: z.string().optional().nullable(),
  logoLinkUrl: z.string().optional().nullable(),
  supportUrl: z.string().optional().nullable(),
  historyRange: z.enum(["7d", "30d", "90d"]).optional().default("7d"),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        resources: z.array(
          z.object({ type: z.literal("monitor"), monitorId: z.string() })
        ),
      })
    )
    .optional()
    .default([]),
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
    .optional()
    .default([]),
  updates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional()
    .default([]),
});

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const statusPages = await prisma.statusPage.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        isPublished: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      statusPages: statusPages.map((page) => ({
        id: page.id,
        name: page.name,
        isPublished: page.isPublished,
        historyRange: "7d", // Default value since it's not in DB yet
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching status pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    console.log("🔍 POST /api/status-pages - User:", user.id);
    const body = await req.json();
    console.log("🔍 Request body:", body);
    
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    console.log("Validation passed:", parsed.data);

    // Create the status page in the database
    const statusPage = await prisma.statusPage.create({
      data: {
        name: parsed.data.name,
        isPublished: parsed.data.isPublished ?? false,
        logoUrl: parsed.data.logoUrl,
        logo: parsed.data.logoLinkUrl ?? null,
        userId: user.id,
      },
    });

    // Create sections if provided
    if (parsed.data.sections && parsed.data.sections.length > 0) {
      await prisma.statusPageSection.createMany({
        data: parsed.data.sections.map((section, index) => ({
          name: section.name,
          description: null,
          order: index + 1,
          type: "BOTH", // Default type
          monitorId: section.resources[0]?.monitorId || "", // Use first monitor if available
          statusPageId: statusPage.id,
        })),
      });
    }

    // Fetch the complete status page with sections
    const completeStatusPage = await prisma.statusPage.findUnique({
      where: { id: statusPage.id },
      include: {
        statusPageSections: {
          orderBy: { order: "asc" },
        },
        maintenances: true,
        updates: true,
      },
    });

    const response = {
      id: statusPage.id,
      userId: statusPage.userId,
      name: statusPage.name,
      isPublished: statusPage.isPublished,
      logoUrl: statusPage.logoUrl,
      logoLinkUrl: statusPage.logo,
      supportUrl: null, // 
      historyRange: "7d", // Default value
      sections: completeStatusPage?.statusPageSections.map(section => ({
        id: section.id,
        name: section.name,
        resources: [{ type: "monitor", monitorId: section.monitorId }],
      })) || [],
      maintenances: [],
      updates: [],
      createdAt: statusPage.createdAt.toISOString(),
      updatedAt: statusPage.updatedAt.toISOString(),
    };

    console.log("Status page created successfully:", response);
    return NextResponse.json(
      { message: "Status page created", statusPage: response },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating status page:", error);
    console.error("Error stack:", (error as Error).stack);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
});
