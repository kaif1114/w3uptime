import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

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
      bestRegion,
      worstRegion,
      latencyByCountry,
      latencyByContinent,
      latencyByCity,
      sampleCountByCountry,
    ] = await Promise.all([
      // Uptime data - cast bigint columns to avoid type mismatches
      prisma.$queryRaw`
        SELECT 
          total_checks::numeric,
          successful_checks::numeric,
          failed_checks::numeric,
          uptime_percentage,
          availability_sla
        FROM get_uptime_data(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Total latency statistics - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          avg_latency,
          min_latency,
          max_latency,
          sample_count::numeric
        FROM get_total_avg_latency(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Best performing region - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          region_type,
          region_name,
          avg_latency,
          sample_count::numeric
        FROM get_best_performing_region(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Worst performing region - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          region_type,
          region_name,
          avg_latency,
          sample_count::numeric
        FROM get_worst_performing_region(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Latency by country - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          country_code,
          avg_latency,
          sample_count::numeric
        FROM get_avg_latency_by_country(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Latency by continent - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          continent_code,
          avg_latency,
          sample_count::numeric
        FROM get_avg_latency_by_continent(${monitorid}::TEXT, ${period}::TEXT)
      `,
      
      // Latency by city - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          city,
          country_code,
          avg_latency,
          sample_count::numeric
        FROM get_avg_latency_by_city(${monitorid}::TEXT, ${period}::TEXT)
      `,

      // Sample count by country (for world map) - cast bigint columns
      prisma.$queryRaw`
        SELECT 
          country_code,
          sample_count::numeric,
          avg_latency
        FROM get_sample_count_by_country(${monitorid}::TEXT, ${period}::TEXT)
      `,
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
      uptime: convertBigIntToNumber((uptimeData as any[])[0]) || null,
      latency: convertBigIntToNumber((totalLatencyData as any[])[0]) || null,
      bestRegion: convertBigIntToNumber((bestRegion as any[])[0]) || null,
      worstRegion: convertBigIntToNumber((worstRegion as any[])[0]) || null,
      regional: {
        byCountry: convertBigIntToNumber(latencyByCountry as any[]) || [],
        byContinent: convertBigIntToNumber(latencyByContinent as any[]) || [],
        byCity: convertBigIntToNumber(latencyByCity as any[]) || [],
      },
      worldMap: {
        byCountry: convertBigIntToNumber(sampleCountByCountry as any[]) || [],
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