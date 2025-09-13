import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { MonitorAnalyticsData } from "@/types/analytics";

const analyticsQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// GET /api/monitors/[monitorid]/analytics - Get comprehensive monitor analytics
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);
    
    const validation = analyticsQuerySchema.safeParse({
      period: searchParams.get('period') || 'day',
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { period } = validation.data;

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

    // Execute all analytics queries in parallel
    const [
      uptimeData,
      totalLatencyData,
      bestRegion,
      worstRegion,
      latencyByCountry,
      latencyByContinent,
      latencyByCity,
      sampleCountByCountry,
    ] = await Promise.all([
      // Uptime data
      prisma.$queryRawUnsafe(`SELECT * FROM get_uptime_data($1, $2)`, monitorid, period),
      
      // Total latency statistics
      prisma.$queryRawUnsafe(`SELECT * FROM get_total_avg_latency($1, $2)`, monitorid, period),
      
      // Best performing region
      prisma.$queryRawUnsafe(`SELECT * FROM get_best_performing_region($1, $2)`, monitorid, period),
      
      // Worst performing region
      prisma.$queryRawUnsafe(`SELECT * FROM get_worst_performing_region($1, $2)`, monitorid, period),
      
      // Latency by country
      prisma.$queryRawUnsafe(`SELECT * FROM get_avg_latency_by_country($1, $2)`, monitorid, period),
      
      // Latency by continent
      prisma.$queryRawUnsafe(`SELECT * FROM get_avg_latency_by_continent($1, $2)`, monitorid, period),
      
      // Latency by city
      prisma.$queryRawUnsafe(`SELECT * FROM get_avg_latency_by_city($1, $2)`, monitorid, period),

      // Sample count by country (for world map)
      prisma.$queryRawUnsafe(`SELECT * FROM get_sample_count_by_country($1, $2)`, monitorid, period),
    ]);

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
          converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
      }
      return obj;
    };

    return NextResponse.json({
      monitorId: monitorid,
      period,
      uptime: convertBigIntToNumber((uptimeData as MonitorAnalyticsData[])[0]) || null,
      latency: convertBigIntToNumber((totalLatencyData as MonitorAnalyticsData[])[0]) || null,
      bestRegion: convertBigIntToNumber((bestRegion as MonitorAnalyticsData[])[0]) || null,
      worstRegion: convertBigIntToNumber((worstRegion as MonitorAnalyticsData[])[0]) || null,
      regional: {
        byCountry: convertBigIntToNumber(latencyByCountry as MonitorAnalyticsData[]) || [],
        byContinent: convertBigIntToNumber(latencyByContinent as MonitorAnalyticsData[]) || [],
        byCity: convertBigIntToNumber(latencyByCity as MonitorAnalyticsData[]) || [],
      },
      worldMap: {
        byCountry: convertBigIntToNumber(sampleCountByCountry as MonitorAnalyticsData[]) || [],
      },
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching monitor analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});