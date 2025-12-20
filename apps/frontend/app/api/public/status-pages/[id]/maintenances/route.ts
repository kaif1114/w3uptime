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

    
    const maintenances = await prisma.maintenance.findMany({
      where: { statusPageId: id },
      orderBy: { from: 'desc' },
    });

    
    const formattedMaintenances = maintenances.map(maintenance => ({
      id: maintenance.id,
      title: maintenance.title,
      description: maintenance.description,
      from: maintenance.from.toISOString(),
      to: maintenance.to.toISOString(),
      
      status: (() => {
        const now = new Date();
        const from = new Date(maintenance.from);
        const to = new Date(maintenance.to);
        
        if (now < from) return "scheduled";
        if (now >= from && now <= to) return "in_progress";
        return "completed";
      })(),
    }));

    return NextResponse.json({
      maintenances: formattedMaintenances,
    });
  } catch (error) {
    console.error("Error fetching public maintenances:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};