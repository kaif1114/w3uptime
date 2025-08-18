import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const analyticsQuerySchema = z.object({
  period: z.enum(['1hr', '1day', '3days', '1week', '2weeks', '30days', '90days']).default('30days'),
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
      period: searchParams.get('period') || '30days',
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
      downtimeData,
      bestRegion,
      latencyByCountry,
      latencyByContinent,
      latencyByCity,
    ] = await Promise.all([
      // Uptime data
      prisma.$queryRaw`SELECT * FROM get_uptime_data(${monitorid}, ${period})`,
      
      // Total latency statistics
      prisma.$queryRaw`SELECT * FROM get_total_avg_latency(${monitorid}, ${period})`,
      
      // Downtime data - cast intervals to text
      prisma.$queryRaw`
        SELECT 
          total_downtime_duration::text,
          downtime_incidents,
          avg_incident_duration::text,
          longest_incident::text,
          mttr::text
        FROM get_downtime_data(${monitorid}, ${period})
      `,
      
      // Best performing region
      prisma.$queryRaw`SELECT * FROM get_best_performing_region(${monitorid}, ${period})`,
      
      // Latency by country
      prisma.$queryRaw`SELECT * FROM get_avg_latency_by_country(${monitorid}, ${period})`,
      
      // Latency by continent
      prisma.$queryRaw`SELECT * FROM get_avg_latency_by_continent(${monitorid}, ${period})`,
      
      // Latency by city
      prisma.$queryRaw`SELECT * FROM get_avg_latency_by_city(${monitorid}, ${period})`,
    ]);

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: any = {};
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
      uptime: convertBigIntToNumber(uptimeData[0]) || null,
      latency: convertBigIntToNumber(totalLatencyData[0]) || null,
      downtime: convertBigIntToNumber(downtimeData[0]) || null,
      bestRegion: convertBigIntToNumber(bestRegion[0]) || null,
      regional: {
        byCountry: convertBigIntToNumber(latencyByCountry) || [],
        byContinent: convertBigIntToNumber(latencyByContinent) || [],
        byCity: convertBigIntToNumber(latencyByCity) || [],
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