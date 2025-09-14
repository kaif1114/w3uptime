import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { 
  MonitorAnalyticsData, 
  RawMonitorStatsResult, 
  RawPerformingRegionResult, 
  RawTimeseriesQueryResult,
  ProcessedRegionData 
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
      cityData,
    ] = await Promise.all([
      // Monitor uptime and latency statistics
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_stats($1::UUID, $2::TEXT)`, monitorid, period),
      
      // Best performing regions (top 1)
      prisma.$queryRawUnsafe(`SELECT * FROM get_best_performing_regions($1::TEXT, $2::TEXT, $3::INTEGER)`, 'country', period, 1),
      
      // Worst performing regions (top 1)
      prisma.$queryRawUnsafe(`SELECT * FROM get_worst_performing_regions($1::TEXT, $2::TEXT, $3::INTEGER)`, 'country', period, 1),
      
      // Continental timeseries data (aggregated)
      prisma.$queryRawUnsafe(`SELECT * FROM get_continent_timeseries(NULL, $1::TEXT)`, period),
      
      // Country timeseries data (aggregated)
      prisma.$queryRawUnsafe(`SELECT * FROM get_country_timeseries(NULL, $1::TEXT)`, period),
      
      // City timeseries data (aggregated)
      prisma.$queryRawUnsafe(`SELECT * FROM get_city_timeseries(NULL, NULL, $1::TEXT)`, period),
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
    const bestRegion = (bestRegions as RawPerformingRegionResult[])[0] || null;
    const worstRegion = (worstRegions as RawPerformingRegionResult[])[0] || null;

    // Group regional data by continent/country for easier consumption
    const continentMap = new Map<string, ProcessedRegionData>();
    (continentData as RawTimeseriesQueryResult[]).forEach(item => {
      if (!item.continent_code || !continentMap.has(item.continent_code)) {
        const continentCode = item.continent_code || 'unknown';
        continentMap.set(continentCode, {
          continent_code: item.continent_code,
          avg_latency: 0,
          sample_count: 0,
          total_latency: 0,
          total_samples: 0
        });
      }
      const continent = continentMap.get(item.continent_code || 'unknown');
      if (continent) {
        continent.total_latency += Number(item.avg_latency || 0) * Number(item.total_ticks || 0);
        continent.total_samples += Number(item.total_ticks || 0);
        continent.avg_latency = continent.total_samples > 0 ? continent.total_latency / continent.total_samples : 0;
        continent.sample_count = continent.total_samples;
      }
    });

    const countryMap = new Map<string, ProcessedRegionData>();
    (countryData as RawTimeseriesQueryResult[]).forEach(item => {
      if (!item.country_code || !countryMap.has(item.country_code)) {
        const countryCode = item.country_code || 'unknown';
        countryMap.set(countryCode, {
          country_code: item.country_code,
          avg_latency: 0,
          sample_count: 0,
          total_latency: 0,
          total_samples: 0
        });
      }
      const country = countryMap.get(item.country_code || 'unknown');
      if (country) {
        country.total_latency += Number(item.avg_latency || 0) * Number(item.total_ticks || 0);
        country.total_samples += Number(item.total_ticks || 0);
        country.avg_latency = country.total_samples > 0 ? country.total_latency / country.total_samples : 0;
        country.sample_count = country.total_samples;
      }
    });

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
        byCountry: Array.from(countryMap.values()).map(country => ({
          country_code: country.country_code,
          avg_latency: Number(country.avg_latency.toFixed(2)),
          sample_count: country.sample_count,
        })).sort((a, b) => a.avg_latency - b.avg_latency), // Sort by best latency
        byContinent: Array.from(continentMap.values()).map(continent => ({
          continent_code: continent.continent_code,
          avg_latency: Number(continent.avg_latency.toFixed(2)),
          sample_count: continent.sample_count,
        })).sort((a, b) => a.avg_latency - b.avg_latency), // Sort by best latency
        byCity: [], // TODO: Implement city aggregation if needed
      },
      worldMap: {
        byCountry: Array.from(countryMap.values()).map(country => ({
          country_code: country.country_code,
          sample_count: country.sample_count,
          avg_latency: Number(country.avg_latency.toFixed(2)),
        })),
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