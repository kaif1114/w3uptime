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
        isPublished: true 
      },
      select: { id: true },
    });

    if (!statusPage) {
      return NextResponse.json(
        { error: "Status page not found or not published" },
        { status: 404 }
      );
    }

    
    const updates = await prisma.update.findMany({
      where: { statusPageId: id },
      include: {
        affectedSections: {
          include: {
            section: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      title: update.title,
      description: update.description,
      publishedAt: update.publishedAt.toISOString(),
      affectedSections: update.affectedSections.map(affected => ({
        id: affected.id,
        status: affected.status,
        section: {
          id: affected.section.id,
          name: affected.section.name,
        },
      })),
    }));

    return NextResponse.json({
      updates: formattedUpdates,
    });
  } catch (error) {
    console.error("Error fetching public updates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};