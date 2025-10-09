import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);

    
    const statusPage = await prisma.statusPage.findFirst({
      where: { 
        id, 
        isPublished: true 
      },
      select: { 
        id: true,
        statusPageSections: {
          select: {
            monitorId: true,
          },
        },
      },
    });

    if (!statusPage) {
      return NextResponse.json(
        { error: "Status page not found or not published" },
        { status: 404 }
      );
    }

    
    const monitorIds = statusPage.statusPageSections.map(section => section.monitorId);

    if (monitorIds.length === 0) {
      return NextResponse.json({
        incidents: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });
    }

    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 100);
    const status = searchParams.get('status') as "ONGOING" | "ACKNOWLEDGED" | "RESOLVED" | null;
    const monitorId = searchParams.get('monitorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    
    const whereClause: Record<string, unknown> = {
      monitorId: {
        in: monitorIds,
      },
    };

    if (status) {
      whereClause.status = status;
    }

    if (monitorId && monitorIds.includes(monitorId)) {
      whereClause.monitorId = monitorId;
    }

    if (startDate || endDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      whereClause.createdAt = dateFilter;
    }

    
    const orderBy: Record<string, unknown> = {};
    if (sortBy === 'createdAt' || sortBy === 'resolvedAt') {
      orderBy[sortBy] = sortOrder;
    } else if (sortBy === 'downtime') {
      orderBy.downtime = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; 
    }

    
    const total = await prisma.incident.count({
      where: whereClause,
    });

    
    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    
    const formattedIncidents = incidents.map(incident => ({
      id: incident.id,
      title: incident.title,
      cause: incident.cause,
      status: incident.status,
      monitorId: incident.monitorId,
      monitor: incident.Monitor ? {
        id: incident.Monitor.id,
        name: incident.Monitor.name,
        url: incident.Monitor.url,
      } : null,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt?.toISOString() || null,
      resolvedAt: incident.resolvedAt?.toISOString() || null,
      downtime: incident.downtime,
    }));

    return NextResponse.json({
      incidents: formattedIncidents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching public incidents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};