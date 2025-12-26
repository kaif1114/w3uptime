import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";

export const GET = async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    const statusPage = await prisma.statusPage.findFirst({
      where: {
        id,
        isPublished: true, 
      },
      include: {
        statusPageSections: {
          orderBy: { order: "asc" },
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                url: true,
                status: true,
                lastCheckedAt: true,
              },
            },
          },
        },
        maintenances: true,
        updates: true,
      },
    });

    if (!statusPage) {
      return NextResponse.json(
        { error: "Status page not found or not published" },
        { status: 404 }
      );
    }

    const response = {
      id: statusPage.id,
      name: statusPage.name,
      logoUrl: statusPage.logoUrl,
      logoLinkUrl: statusPage.logo,
      supportUrl: statusPage.supportUrl,
      announcement: statusPage.announcement,
      sections: statusPage.statusPageSections.map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description,
        order: section.order,
        type: section.type,
        monitor: section.monitor,
      })),
      maintenances: statusPage.maintenances.map((maintenance) => ({
        id: maintenance.id,
        title: maintenance.title,
        description: maintenance.description,
        from: maintenance.from.toISOString(),
        to: maintenance.to.toISOString(),
      })),
      updates: statusPage.updates.map((update) => ({
        id: update.id,
        title: update.title,
        description: update.description,
        publishedAt: update.publishedAt.toISOString(),
      })),
      createdAt: statusPage.createdAt.toISOString(),
      updatedAt: statusPage.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching public status page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};