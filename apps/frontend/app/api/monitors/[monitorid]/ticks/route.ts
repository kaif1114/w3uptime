import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const ticksQuerySchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['GOOD', 'BAD']).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

// GET /api/monitors/[monitorid]/ticks - Get recent monitor ticks with optional filtering
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);
    
    const validation = ticksQuerySchema.safeParse({
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      status: searchParams.get('status') || undefined,
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { limit, offset, status, country, city } = validation.data;

    // Verify monitor ownership
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorid,
        userId: user.id,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    // Build where conditions
    const whereConditions: {
      monitorId: string;
      status?: 'GOOD' | 'BAD';
      countryCode?: string;
      city?: string;
    } = {
      monitorId: monitorid,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (country) {
      whereConditions.countryCode = country;
    }

    if (city) {
      whereConditions.city = city;
    }

    // Get recent monitor ticks with validator information
    const [ticks, totalCount] = await Promise.all([
      prisma.monitorTick.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.monitorTick.count({
        where: whereConditions,
      }),
    ]);

    return NextResponse.json({
      monitorId: monitorid,
      ticks: ticks.map(tick => ({
        id: tick.id,
        status: tick.status,
        latency: tick.latency,
        location: {
          longitude: tick.longitude,
          latitude: tick.latitude,
          countryCode: tick.countryCode,
          continentCode: tick.continentCode,
          city: tick.city,
        },
        validator: {
          id: tick.user.id,
          walletAddress: tick.user.walletAddress,
          type: tick.user.type,
        },
        createdAt: tick.createdAt.toISOString(),
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching monitor ticks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});