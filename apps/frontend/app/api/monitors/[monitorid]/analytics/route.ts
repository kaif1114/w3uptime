import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { 
  MonitorAnalyticsData, 
  RawMonitorStatsResult, 
  RawPerformingRegionResult, 
  RawTimeseriesQueryResult,
  ProcessedRegionData,
  MonitorCountryDataResult,
  MonitorContinentDataResult,
  MonitorBestWorstRegionsResult,
  ProcessedMonitorRegionalData
} from "@/types/analytics";

const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
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
      monitorStats,
      bestRegions,
      worstRegions,
      continentData,
      countryData,
    ] = await Promise.all([
      // Monitor uptime and latency statistics
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_stats($1::UUID, $2::TEXT)`, monitorid, period),
      
      // Best performing regions (top 1)
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_best_worst_regions($1::UUID, $2::TEXT, $3::TEXT, $4::TEXT) LIMIT 1`, monitorid, period, 'country', 'best'),
      
      // Worst performing regions (top 1)
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_best_worst_regions($1::UUID, $2::TEXT, $3::TEXT, $4::TEXT) ORDER BY performance_score ASC LIMIT 1`, monitorid, period, 'country', 'worst'),
      
      // Continental data for the specific monitor
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_continent_data($1::UUID, $2::TEXT)`, monitorid, period),
      
      // Country data for the specific monitor
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_country_data($1::UUID, $2::TEXT)`, monitorid, period),
    ]);

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
          converted[key] = convertBigIntToNumber((obj as Record<string, unknown>)[key]);
        }
        return converted;
      }
      return obj;
    };

    // Transform the data to match expected frontend format
    const stats = (monitorStats as RawMonitorStatsResult[])[0] || {};
    const bestRegion = (bestRegions as MonitorBestWorstRegionsResult[])[0] || null;
    const worstRegion = (worstRegions as MonitorBestWorstRegionsResult[])[0] || null;

    // Process regional data - these are now already aggregated by the functions
    const processedContinentData: ProcessedMonitorRegionalData[] = (continentData as MonitorContinentDataResult[]).map(item => ({
      continent_code: item.continent_code,
      avg_latency: Number(item.avg_latency || 0),
      sample_count: Number(item.total_ticks || 0),
    }));

    const processedCountryData: ProcessedMonitorRegionalData[] = (countryData as MonitorCountryDataResult[]).map(item => ({
      country_code: item.country_code,
      avg_latency: Number(item.avg_latency || 0),
      sample_count: Number(item.total_ticks || 0),
    }));

    return NextResponse.json({
      monitorId: monitorid,
      period,
      uptime: {
        total_checks: Number(stats.total_checks || 0),
        successful_checks: Number(stats.successful_checks || 0),
        failed_checks: Number(stats.failed_checks || 0),
        uptime_percentage: Number(stats.uptime_percentage || 0),
        availability_sla: Number(stats.uptime_percentage || 0), // Use uptime as SLA for now
      },
      bestRegion: bestRegion ? {
        region_type: "Country", // Default to country for now
        region_name: bestRegion.region_name || bestRegion.region_id || 'Unknown',
        avg_latency: Number(bestRegion.avg_latency || 0),
        sample_count: Number(bestRegion.total_checks || 0),
      } : null,
      worstRegion: worstRegion ? {
        region_type: "Country", // Default to country for now  
        region_name: worstRegion.region_name || worstRegion.region_id || 'Unknown',
        avg_latency: Number(worstRegion.avg_latency || 0),
        sample_count: Number(worstRegion.total_checks || 0),
      } : null,
      regional: {
        byCountry: processedCountryData.sort((a, b) => a.avg_latency - b.avg_latency), // Sort by best latency
        byContinent: processedContinentData.sort((a, b) => a.avg_latency - b.avg_latency), // Sort by best latency
        byCity: [], // Not needed for monitor-specific data
      },
      worldMap: {
        byCountry: processedCountryData,
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